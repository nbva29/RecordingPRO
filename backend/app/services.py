from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Category, Service, User
from app.organizations import get_organization
from app.schemas import (
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
    ServiceCreate,
    ServiceRead,
    ServiceUpdate,
)


router = APIRouter(prefix="/api", tags=["Категории и услуги"])


def get_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена",
        )
    return category


def get_service(db: Session, service_id: int) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Услуга не найдена",
        )
    return service


def category_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Категория с таким названием уже существует",
    )


@router.get(
    "/organizations/{organization_id}/categories",
    response_model=list[CategoryRead],
    summary="Категории услуг организации",
    responses={404: {"description": "Организация не найдена"}},
)
def list_categories(
    organization_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[CategoryRead]:
    get_organization(db, organization_id)
    categories = db.scalars(
        select(Category)
        .where(Category.organization_id == organization_id)
        .order_by(Category.name)
    ).all()
    return [CategoryRead.model_validate(category) for category in categories]


@router.get(
    "/categories/{category_id}",
    response_model=CategoryRead,
    summary="Получить категорию услуг",
    responses={404: {"description": "Категория не найдена"}},
)
def read_category(
    category_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> CategoryRead:
    return CategoryRead.model_validate(get_category(db, category_id))


@router.post(
    "/organizations/{organization_id}/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать категорию услуг",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация не найдена"},
        409: {"description": "Категория с таким названием уже существует"},
    },
)
def create_category(
    organization_id: int,
    data: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> CategoryRead:
    organization = get_organization(db, organization_id)
    category = Category(organization=organization, name=data.name)
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise category_conflict() from None

    db.refresh(category)
    return CategoryRead.model_validate(category)


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryRead,
    summary="Переименовать категорию услуг",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Категория не найдена"},
        409: {"description": "Категория с таким названием уже существует"},
    },
)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> CategoryRead:
    category = get_category(db, category_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise category_conflict() from None

    db.refresh(category)
    return CategoryRead.model_validate(category)


@router.delete(
    "/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить категорию услуг",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Категория не найдена"},
        409: {"description": "В категории ещё есть услуги"},
    },
)
def delete_category(
    category_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    category = get_category(db, category_id)
    service_exists = db.scalar(
        select(Service.id).where(Service.category_id == category.id).limit(1)
    )
    if service_exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Сначала удалите услуги этой категории",
        )

    db.delete(category)
    db.commit()


@router.get(
    "/organizations/{organization_id}/services",
    response_model=list[ServiceRead],
    summary="Услуги организации",
    responses={404: {"description": "Организация не найдена"}},
)
def list_services(
    organization_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> list[ServiceRead]:
    get_organization(db, organization_id)
    services = db.scalars(
        select(Service)
        .join(Service.category)
        .where(Category.organization_id == organization_id)
        .order_by(Service.id)
    ).all()
    return [ServiceRead.model_validate(service) for service in services]


@router.get(
    "/services/{service_id}",
    response_model=ServiceRead,
    summary="Получить услугу",
    responses={404: {"description": "Услуга не найдена"}},
)
def read_service(
    service_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> ServiceRead:
    return ServiceRead.model_validate(get_service(db, service_id))


@router.post(
    "/organizations/{organization_id}/services",
    response_model=ServiceRead,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить услугу организации",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация или категория не найдена"},
    },
)
def create_service(
    organization_id: int,
    data: ServiceCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ServiceRead:
    organization = get_organization(db, organization_id)
    category = db.get(Category, data.category_id)
    if category is None or category.organization_id != organization.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Категория не найдена в этой организации",
        )

    service = Service(
        category=category,
        name=data.name,
        description=data.description,
        price=data.price,
        duration=data.duration,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return ServiceRead.model_validate(service)


@router.patch(
    "/services/{service_id}",
    response_model=ServiceRead,
    summary="Изменить услугу и цену",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Услуга не найдена"},
    },
)
def update_service(
    service_id: int,
    data: ServiceUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ServiceRead:
    service = get_service(db, service_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)
    return ServiceRead.model_validate(service)


@router.delete(
    "/services/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить услугу",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Услуга не найдена"},
    },
)
def delete_service(
    service_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> None:
    service = get_service(db, service_id)
    db.delete(service)
    db.commit()
