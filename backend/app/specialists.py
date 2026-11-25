from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_admin, require_organization_admin
from app.database import get_db
from app.models import Category, Service, Specialist, User
from app.organizations import get_organization
from app.schemas import SpecialistCreate, SpecialistRead, SpecialistUpdate
from app.services import get_service


router = APIRouter(prefix="/api", tags=["Специалисты"])


def get_specialist(
    db: Session, specialist_id: int, *, for_update: bool = False
) -> Specialist:
    query = (
        select(Specialist)
        .where(Specialist.id == specialist_id)
        .options(selectinload(Specialist.services))
    )
    if for_update:
        query = query.with_for_update()
    specialist = db.scalar(query)
    if specialist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Специалист не найден",
        )
    return specialist


def specialist_read(specialist: Specialist) -> SpecialistRead:
    return SpecialistRead(
        id=specialist.id,
        organization_id=specialist.organization_id,
        name=specialist.name,
        description=specialist.description,
        service_ids=sorted(service.id for service in specialist.services),
    )


def resolve_services(
    db: Session, organization_id: int, service_ids: list[int]
) -> list[Service]:
    unique_ids = list(dict.fromkeys(service_ids))
    if not unique_ids:
        return []

    services = db.scalars(
        select(Service)
        .join(Service.category)
        .where(
            Service.id.in_(unique_ids),
            Category.organization_id == organization_id,
        )
    ).all()
    if len(services) != len(unique_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Услуга не найдена в этой организации",
        )

    services_by_id = {service.id: service for service in services}
    return [services_by_id[service_id] for service_id in unique_ids]


@router.get(
    "/organizations/{organization_id}/specialists",
    response_model=list[SpecialistRead],
    summary="Специалисты организации",
    responses={404: {"description": "Организация не найдена"}},
)
def list_specialists(
    organization_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[SpecialistRead]:
    get_organization(db, organization_id)
    specialists = db.scalars(
        select(Specialist)
        .where(Specialist.organization_id == organization_id)
        .options(selectinload(Specialist.services))
        .order_by(Specialist.name, Specialist.id)
    ).all()
    return [specialist_read(specialist) for specialist in specialists]


@router.get(
    "/specialists/{specialist_id}",
    response_model=SpecialistRead,
    summary="Получить специалиста",
    responses={404: {"description": "Специалист не найден"}},
)
def read_specialist(
    specialist_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> SpecialistRead:
    return specialist_read(get_specialist(db, specialist_id))


@router.post(
    "/organizations/{organization_id}/specialists",
    response_model=SpecialistRead,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить специалиста",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация или услуга не найдена"},
    },
)
def create_specialist(
    organization_id: int,
    data: SpecialistCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> SpecialistRead:
    organization = get_organization(db, organization_id)
    require_organization_admin(_admin, organization_id)
    services = resolve_services(db, organization.id, data.service_ids)
    specialist = Specialist(
        organization=organization,
        name=data.name,
        description=data.description,
        services=services,
    )
    db.add(specialist)
    db.commit()
    db.refresh(specialist)
    return specialist_read(specialist)


@router.patch(
    "/specialists/{specialist_id}",
    response_model=SpecialistRead,
    summary="Изменить специалиста и его услуги",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Специалист или услуга не найдена"},
    },
)
def update_specialist(
    specialist_id: int,
    data: SpecialistUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> SpecialistRead:
    specialist = get_specialist(db, specialist_id)
    require_organization_admin(_admin, specialist.organization_id)
    changes = data.model_dump(exclude_unset=True)
    service_ids = changes.pop("service_ids", None)
    if service_ids is not None:
        specialist.services = resolve_services(
            db, specialist.organization_id, service_ids
        )
    for field, value in changes.items():
        setattr(specialist, field, value)

    db.commit()
    db.refresh(specialist)
    return specialist_read(specialist)


@router.delete(
    "/specialists/{specialist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить специалиста",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Специалист не найден"},
        409: {"description": "У специалиста существуют записи"},
    },
)
def delete_specialist(
    specialist_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    specialist = get_specialist(db, specialist_id, for_update=True)
    require_organization_admin(_admin, specialist.organization_id)
    db.delete(specialist)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить специалиста, для которого существуют записи",
        ) from None


@router.get(
    "/services/{service_id}/specialists",
    response_model=list[SpecialistRead],
    summary="Специалисты услуги",
    responses={404: {"description": "Услуга не найдена"}},
)
def list_service_specialists(
    service_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[SpecialistRead]:
    service = get_service(db, service_id)
    specialists = db.scalars(
        select(Specialist)
        .where(Specialist.services.any(Service.id == service.id))
        .options(selectinload(Specialist.services))
        .order_by(Specialist.name, Specialist.id)
    ).all()
    return [specialist_read(specialist) for specialist in specialists]
