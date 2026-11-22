from datetime import date, time
from uuid import UUID
from typing import Annotated, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: EmailStr = Field(max_length=254)
    password: SecretStr = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class UserLogin(UserCreate):
    password: SecretStr = Field(min_length=1, max_length=128)


class TokenRead(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    name: str | None
    phone: str | None
    role: RoleRead


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, min_length=1, max_length=32)


class PasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    current_password: SecretStr = Field(min_length=1, max_length=128)
    new_password: SecretStr = Field(min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: EmailStr = Field(max_length=254)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class PasswordResetConfirm(PasswordResetRequest):
    code: SecretStr = Field(
        min_length=6, max_length=6, description="Шестизначный код из письма"
    )
    new_password: SecretStr = Field(min_length=8, max_length=128)

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: SecretStr) -> SecretStr:
        code = value.get_secret_value()
        if not code.isascii() or not code.isdigit():
            raise ValueError("Код должен состоять из 6 цифр")
        return value


class MessageRead(BaseModel):
    detail: str


class OrganizationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    address: str = Field(min_length=1, max_length=255)
    city: str = Field(min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=32)


class OrganizationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    city: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("name", "address", "city", mode="before")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("Поле обязательно и не может быть null")
        return value


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    address: str
    city: str
    phone: str | None


class CategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)


class CategoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("name", mode="before")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("Поле обязательно и не может быть null")
        return value


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class ServiceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    price: int = Field(ge=0, le=10_000_000)
    duration: int = Field(gt=0, le=1440)
    discount_percent: int = Field(default=0, ge=0, le=100)
    is_available_for_online_booking: bool = True


class ServiceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    price: int | None = Field(default=None, ge=0, le=10_000_000)
    duration: int | None = Field(default=None, gt=0, le=1440)
    discount_percent: int | None = Field(default=None, ge=0, le=100)
    is_available_for_online_booking: bool | None = Field(default=None)

    @field_validator(
        "name",
        "price",
        "duration",
        "discount_percent",
        "is_available_for_online_booking",
        mode="before",
    )
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("Поле обязательно и не может быть null")
        return value


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    name: str
    description: str | None
    price: int
    duration: int
    discount_percent: int
    final_price: int
    is_available_for_online_booking: bool


class ServiceOptionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    price: int = Field(ge=0, le=10_000_000)


class ServiceOptionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=150)
    price: int | None = Field(default=None, ge=0, le=10_000_000)

    @field_validator("name", "price", mode="before")
    @classmethod
    def reject_null(cls, value: object) -> object:
        if value is None:
            raise ValueError("Поле обязательно и не может быть null")
        return value


class ServiceOptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    service_id: int
    name: str
    price: int


class PriceCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    option_ids: list[Annotated[int, Field(gt=0)]] = Field(default_factory=list)


class PriceCalculationRead(BaseModel):
    service_id: int
    base_price: int
    discount_percent: int
    discount_amount: int
    final_price: int
    options: list[ServiceOptionRead]
    options_total: int
    total_price: int


class SpecialistCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    service_ids: list[Annotated[int, Field(gt=0)]] = Field(default_factory=list)


class SpecialistUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    service_ids: list[Annotated[int, Field(gt=0)]] | None = Field(default=None)

    @field_validator("name", mode="before")
    @classmethod
    def reject_null_name(cls, value: object) -> object:
        if value is None:
            raise ValueError("Поле обязательно и не может быть null")
        return value

    @field_validator("service_ids", mode="before")
    @classmethod
    def reject_null_service_ids(cls, value: object) -> object:
        if value is None:
            raise ValueError("Передайте [] чтобы очистить список услуг")
        return value


class SpecialistRead(BaseModel):
    id: int
    organization_id: int
    name: str
    description: str | None
    service_ids: list[int]


class WorkInterval(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    day_of_week: int = Field(
        ge=0, le=6, description="0 — понедельник, 6 — воскресенье"
    )
    start_time: time
    end_time: time

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time(cls, value: time) -> time:
        if value.tzinfo is not None or value.second or value.microsecond:
            raise ValueError(
                "Укажите местное время с точностью до минуты, без часового пояса"
            )
        return value

    @model_validator(mode="after")
    def validate_time_range(self) -> Self:
        if self.end_time <= self.start_time:
            raise ValueError(
                "Время окончания должно быть позже времени начала в том же дне"
            )
        return self


class ScheduleReplace(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intervals: list[WorkInterval]

    @model_validator(mode="after")
    def validate_overlaps(self) -> Self:
        intervals = sorted(
            self.intervals, key=lambda item: (item.day_of_week, item.start_time)
        )
        for previous, current in zip(intervals, intervals[1:]):
            if (
                previous.day_of_week == current.day_of_week
                and current.start_time < previous.end_time
            ):
                raise ValueError("Рабочие интервалы одного дня не должны пересекаться")
        return self


class ScheduleRead(BaseModel):
    specialist_id: int
    intervals: list[WorkInterval]


class AvailableSlot(BaseModel):
    start_time: time
    end_time: time


class AvailableSlotsRead(BaseModel):
    specialist_id: int
    service_id: int
    date: date
    slots: list[AvailableSlot]


class CategoryWithServices(CategoryRead):
    services: list[ServiceRead]


class OrganizationCard(OrganizationRead):
    categories: list[CategoryWithServices]
