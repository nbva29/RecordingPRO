from datetime import datetime, timedelta, timezone
from hashlib import sha256
from hmac import new as hmac_new
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.config import settings


password_hash = PasswordHash.recommended()
JWT_ALGORITHM = "HS256"


def hash_reset_code(user_id: UUID, code: str) -> str:
    return hmac_new(
        settings.jwt_secret_key.get_secret_value().encode(),
        f"password-reset:{user_id}:{code}".encode(),
        sha256,
    ).hexdigest()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded_password: str) -> bool:
    return password_hash.verify(password, encoded_password)


def create_access_token(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> UUID:
    payload = jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[JWT_ALGORITHM],
        options={"require": ["sub", "iat", "exp"]},
    )
    return UUID(payload["sub"])
