from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_admin
from app.database import get_db
from app.models import Category, Organization, User
from app.schemas import (
    OrganizationCard,
    OrganizationCreate,
    OrganizationRead,
    OrganizationUpdate,
)


router = APIRouter(prefix="/api/organizations", tags=["Организации"])

LIKE_ESCAPE = "\\"


def escape_like(value: str) -> str:
    return (
        value.replace(LIKE_ESCAPE, LIKE_ESCAPE * 2)
        .replace("%", LIKE_ESCAPE + "%")
        .replace("_", LIKE_ESCAPE + "_")
    )


def get_organization(db: Session, organization_id: int) -> Organization:
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена",
        )
    return organization


def get_organization_card(db: Session, organization_id: int) -> Organization:
    organization = db.scalar(
        select(Organization)
        .where(Organization.id == organization_id)
        .options(
            selectinload(Organization.categories).selectinload(Category.services)
        )
    )
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Организация не найдена",
        )
    return organization


@router.post(
    "",
    response_model=OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать организацию",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
    },
)
def create_organization(
    data: OrganizationCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> OrganizationRead:
    organization = Organization(**data.model_dump())
    db.add(organization)
    db.commit()
    db.refresh(organization)
    return OrganizationRead.model_validate(organization)


@router.get(
    "",
    response_model=list[OrganizationCard],
    summary="Каталог организаций",
    responses={200: {"description": "Список организаций с категориями и услугами"}},
)
def list_organizations(
    db: Annotated[Session, Depends(get_db)],
    search: Annotated[str | None, Query(max_length=150)] = None,
    city: Annotated[str | None, Query(max_length=100)] = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
) -> list[OrganizationCard]:
    query = select(Organization).options(
        selectinload(Organization.categories).selectinload(Category.services)
    )

    if search and search.strip():
        pattern = f"%{escape_like(search.strip())}%"
        query = query.where(Organization.name.ilike(pattern, escape=LIKE_ESCAPE))
    if city and city.strip():
        pattern = f"%{escape_like(city.strip())}%"
        query = query.where(Organization.city.ilike(pattern, escape=LIKE_ESCAPE))
    if category and category.strip():
        query = query.where(
            Organization.categories.any(Category.name == category.strip())
        )

    organizations = db.scalars(query.order_by(Organization.name)).all()
    return [
        OrganizationCard.model_validate(organization) for organization in organizations
    ]


@router.get(
    "/{organization_id}",
    response_model=OrganizationCard,
    summary="Карточка организации",
    responses={404: {"description": "Организация не найдена"}},
)
def read_organization(
    organization_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> OrganizationCard:
    return OrganizationCard.model_validate(
        get_organization_card(db, organization_id)
    )


@router.patch(
    "/{organization_id}",
    response_model=OrganizationRead,
    summary="Отредактировать организацию",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация не найдена"},
    },
)
def update_organization(
    organization_id: int,
    data: OrganizationUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> OrganizationRead:
    organization = get_organization(db, organization_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(organization, field, value)

    db.commit()
    db.refresh(organization)
    return OrganizationRead.model_validate(organization)
