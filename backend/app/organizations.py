from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Organization, User
from app.schemas import OrganizationCreate, OrganizationRead, OrganizationUpdate


router = APIRouter(prefix="/api/organizations", tags=["Организации"])


def get_organization(db: Session, organization_id: int) -> Organization:
    organization = db.get(Organization, organization_id)
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
    "/{organization_id}",
    response_model=OrganizationRead,
    summary="Получить организацию",
    responses={404: {"description": "Организация не найдена"}},
)
def read_organization(
    organization_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> OrganizationRead:
    return OrganizationRead.model_validate(get_organization(db, organization_id))


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
