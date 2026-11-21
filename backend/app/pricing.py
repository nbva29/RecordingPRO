from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Service, ServiceOption, User
from app.schemas import (
    PriceCalculationRead,
    PriceCalculationRequest,
    ServiceOptionCreate,
    ServiceOptionRead,
    ServiceOptionUpdate,
)
from app.services import get_service


router = APIRouter(prefix="/api", tags=["Цены и допопции"])


def get_option(db: Session, option_id: int) -> ServiceOption:
    option = db.get(ServiceOption, option_id)
    if option is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Допопция не найдена",
        )
    return option


def resolve_options(
    db: Session, service_id: int, option_ids: list[int]
) -> list[ServiceOption]:
    unique_ids = list(dict.fromkeys(option_ids))
    if not unique_ids:
        return []

    options = db.scalars(
        select(ServiceOption).where(
            ServiceOption.service_id == service_id,
            ServiceOption.id.in_(unique_ids),
        )
    ).all()
    if len(options) != len(unique_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Допопция не найдена у этой услуги",
        )

    options_by_id = {option.id: option for option in options}
    return [options_by_id[option_id] for option_id in unique_ids]


@router.get(
    "/services/{service_id}/options",
    response_model=list[ServiceOptionRead],
    summary="Допопции услуги",
    responses={404: {"description": "Услуга не найдена"}},
)
def list_options(
    service_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[ServiceOptionRead]:
    service = get_service(db, service_id)
    options = db.scalars(
        select(ServiceOption)
        .where(ServiceOption.service_id == service.id)
        .order_by(ServiceOption.id)
    ).all()
    return [ServiceOptionRead.model_validate(option) for option in options]


@router.post(
    "/services/{service_id}/options",
    response_model=ServiceOptionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить допопцию услуги",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Услуга не найдена"},
    },
)
def create_option(
    service_id: int,
    data: ServiceOptionCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ServiceOptionRead:
    service = get_service(db, service_id)
    option = ServiceOption(
        service=service,
        name=data.name,
        price=data.price,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    return ServiceOptionRead.model_validate(option)


@router.patch(
    "/options/{option_id}",
    response_model=ServiceOptionRead,
    summary="Изменить допопцию",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Допопция не найдена"},
    },
)
def update_option(
    option_id: int,
    data: ServiceOptionUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ServiceOptionRead:
    option = get_option(db, option_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(option, field, value)
    db.commit()
    db.refresh(option)
    return ServiceOptionRead.model_validate(option)


@router.delete(
    "/options/{option_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить допопцию",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Допопция не найдена"},
    },
)
def delete_option(
    option_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    option = get_option(db, option_id)
    db.delete(option)
    db.commit()


@router.post(
    "/services/{service_id}/price",
    response_model=PriceCalculationRead,
    summary="Рассчитать итоговую стоимость услуги",
    responses={
        404: {"description": "Услуга или допопция не найдена"},
    },
)
def calculate_price(
    service_id: int,
    data: PriceCalculationRequest,
    db: Annotated[Session, Depends(get_db)],
) -> PriceCalculationRead:
    service = get_service(db, service_id)
    options = resolve_options(db, service.id, data.option_ids)
    discount_amount = service.price * service.discount_percent // 100
    final_price = service.price - discount_amount
    options_total = sum(option.price for option in options)
    return PriceCalculationRead(
        service_id=service.id,
        base_price=service.price,
        discount_percent=service.discount_percent,
        discount_amount=discount_amount,
        final_price=final_price,
        options=[ServiceOptionRead.model_validate(option) for option in options],
        options_total=options_total,
        total_price=final_price + options_total,
    )
