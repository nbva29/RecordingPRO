from datetime import datetime, timedelta, timezone
from secrets import compare_digest, randbelow
from smtplib import SMTPException
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.mail import send_password_reset_email
from app.models import Role, User
from app.schemas import (
    MessageRead,
    PasswordChange,
    PasswordResetConfirm,
    PasswordResetRequest,
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
    hash_reset_code,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["Авторизация"])
bearer_scheme = HTTPBearer(auto_error=False)
# Unknown accounts still go through password verification.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-account-password")
PASSWORD_RESET_MAX_ATTEMPTS = 5
PASSWORD_RESET_RESEND_SECONDS = 60


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
    user.password_reset_code_hash = None
    user.password_reset_expires_at = None
    user.password_reset_sent_at = None
    user.password_reset_attempts = 0
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/forgot-password",
    response_model=MessageRead,
    summary="Запросить восстановление пароля по email",
    responses={
        429: {"description": "Повторный запрос кода доступен через минуту"},
        503: {"description": "Отправка писем временно недоступна"},
    },
)
def request_password_reset(
    data: PasswordResetRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageRead:
    if not (
        settings.smtp_host
        and settings.smtp_user
        and settings.smtp_password.get_secret_value()
        and settings.smtp_from
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Восстановление пароля временно недоступно",
        )

    user = db.scalar(select(User).where(User.email == data.email).with_for_update())
    if user is not None:
        # MySQL DATETIME stores UTC without timezone information.
        now = datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)
        if (
            user.password_reset_sent_at is not None
            and now < user.password_reset_sent_at
            + timedelta(seconds=PASSWORD_RESET_RESEND_SECONDS)
        ):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Повторно запросить код можно через минуту",
            )
        code = f"{randbelow(1_000_000):06d}"
        user.password_reset_code_hash = hash_reset_code(user.id, code)
        user.password_reset_expires_at = now + timedelta(
            minutes=settings.password_reset_expire_minutes
        )
        user.password_reset_sent_at = now
        user.password_reset_attempts = 0
        db.flush()
        try:
            send_password_reset_email(user.email, code)
        except (SMTPException, OSError):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Восстановление пароля временно недоступно",
            ) from None
        db.commit()

    return MessageRead(
        detail="Если email зарегистрирован, на него отправлено письмо восстановления"
    )


@router.post(
    "/reset-password",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    summary="Задать новый пароль по коду из письма",
    responses={400: {"description": "Недействительный или просроченный код"}},
)
def reset_password(
    data: PasswordResetConfirm,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    # Lock the account so concurrent requests cannot reuse a code or lose attempts.
    user = db.scalar(
        select(User).where(User.email == data.email).with_for_update()
    )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if (
        user is None
        or user.password_reset_code_hash is None
        or user.password_reset_expires_at is None
        or user.password_reset_expires_at <= now
        or user.password_reset_attempts >= PASSWORD_RESET_MAX_ATTEMPTS
    ):
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или просроченный код",
        )

    code_hash = hash_reset_code(user.id, data.code.get_secret_value())
    if not compare_digest(code_hash, user.password_reset_code_hash):
        user.password_reset_attempts += 1
        if user.password_reset_attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
            user.password_reset_code_hash = None
            user.password_reset_expires_at = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или просроченный код",
        )

    user.password_hash = hash_password(data.new_password.get_secret_value())
    user.password_reset_code_hash = None
    user.password_reset_expires_at = None
    user.password_reset_attempts = 0
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
