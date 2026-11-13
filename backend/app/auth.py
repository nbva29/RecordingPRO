from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Role, User
from app.schemas import (
    PasswordChange,
    TokenRead,
    UserCreate,
    UserLogin,
    UserRead,
    UserUpdate,
)
from app.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["Авторизация"])
bearer_scheme = HTTPBearer(auto_error=False)
# Unknown accounts still go through password verification.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-account-password")


def email_conflict() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Пользователь с таким email уже зарегистрирован",
    )


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise unauthorized("Необходимо войти в систему")

    try:
        user_id = decode_access_token(credentials.credentials)
    except (InvalidTokenError, ValueError, TypeError):
        raise unauthorized("Недействительный или просроченный токен") from None

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized("Недействительный или просроченный токен")
    return user


def get_current_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора",
        )
    return user


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


@router.post(
    "/login",
    response_model=TokenRead,
    summary="Вход по email и паролю",
    responses={401: {"description": "Неверный email или пароль"}},
)
def login(
    data: UserLogin,
    db: Annotated[Session, Depends(get_db)],
) -> TokenRead:
    user = db.scalar(select(User).where(User.email == data.email))
    encoded_password = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_valid = verify_password(data.password.get_secret_value(), encoded_password)
    if not password_valid or user is None:
        raise unauthorized("Неверный email или пароль")

    return TokenRead(
        access_token=create_access_token(user.id),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Текущий пользователь",
    responses={401: {"description": "Требуется действительный Bearer-токен"}},
)
def current_user(
    user: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    return UserRead.model_validate(user)


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Изменить имя и телефон текущего пользователя",
    responses={401: {"description": "Требуется действительный Bearer-токен"}},
)
def update_current_user(
    data: UserUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserRead:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Сменить пароль текущего пользователя",
    responses={
        400: {"description": "Неверный текущий пароль"},
        401: {"description": "Требуется действительный Bearer-токен"},
    },
)
def change_password(
    data: PasswordChange,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    if not verify_password(
        data.current_password.get_secret_value(), user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль",
        )

    user.password_hash = hash_password(data.new_password.get_secret_value())
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
