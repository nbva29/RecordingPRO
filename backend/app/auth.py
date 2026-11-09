from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Role, User
from app.schemas import UserCreate, UserRead
from app.security import hash_password


router = APIRouter(prefix="/api/auth", tags=["Авторизация"])


def email_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Пользователь с таким email уже зарегистрирован",
    )


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация клиента",
    responses={409: {"description": "Email уже зарегистрирован"}},
)
def register(
    data: UserCreate,
    db: Annotated[Session, Depends(get_db)],
) -> UserRead:
    email_query = select(User.id).where(User.email == data.email)
    if db.scalar(email_query) is not None:
        raise email_conflict()

    client_role = db.scalar(select(Role).where(Role.name == "client"))
    if client_role is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Регистрация временно недоступна",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password.get_secret_value()),
        role=client_role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request may register the same email after our first check.
        db.rollback()
        if db.scalar(email_query) is not None:
            raise email_conflict() from None
        raise

    db.refresh(user)
    return UserRead.model_validate(user)
