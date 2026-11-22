from datetime import date, datetime, time, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


specialist_services = Table(
    "specialist_services",
    Base.metadata,
    Column(
        "specialist_id",
        ForeignKey("specialists.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "service_id",
        ForeignKey("services.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(32))
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"))
    password_reset_code_hash: Mapped[str | None] = mapped_column(String(64))
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    password_reset_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    password_reset_attempts: Mapped[int] = mapped_column(default=0, server_default="0")

    role: Mapped[Role] = relationship()


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(32))

    categories: Mapped[list["Category"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="Category.name",
    )
    specialists: Mapped[list["Specialist"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
        order_by="Specialist.name",
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("organization_id", "name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))

    organization: Mapped[Organization] = relationship(back_populates="categories")
    services: Mapped[list["Service"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="Service.id",
    )


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_services_price_non_negative"),
        CheckConstraint(
            "discount_percent >= 0 AND discount_percent <= 100",
            name="ck_services_discount_percent_range",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[int]
    duration: Mapped[int]
    discount_percent: Mapped[int] = mapped_column(default=0, server_default="0")
    is_available_for_online_booking: Mapped[bool] = mapped_column(
        default=True, server_default="1"
    )

    category: Mapped[Category] = relationship(back_populates="services")
    specialists: Mapped[list["Specialist"]] = relationship(
        secondary=specialist_services,
        back_populates="services",
        order_by="Specialist.name",
    )
    options: Mapped[list["ServiceOption"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        order_by="ServiceOption.id",
    )

    @property
    def final_price(self) -> int:
        return self.price - self.price * self.discount_percent // 100


class ServiceOption(Base):
    __tablename__ = "service_options"
    __table_args__ = (
        CheckConstraint(
            "price >= 0", name="ck_service_options_price_non_negative"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(150))
    price: Mapped[int]

    service: Mapped[Service] = relationship(back_populates="options")


class Specialist(Base):
    __tablename__ = "specialists"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(Text)

    organization: Mapped[Organization] = relationship(back_populates="specialists")
    services: Mapped[list[Service]] = relationship(
        secondary=specialist_services,
        back_populates="specialists",
        order_by="Service.id",
    )
    work_intervals: Mapped[list["WorkSchedule"]] = relationship(
        back_populates="specialist",
        cascade="all, delete-orphan",
        order_by="(WorkSchedule.day_of_week, WorkSchedule.start_time)",
    )


class WorkSchedule(Base):
    __tablename__ = "work_schedules"
    __table_args__ = (
        CheckConstraint(
            "day_of_week >= 0 AND day_of_week <= 6",
            name="ck_work_schedules_day_of_week",
        ),
        CheckConstraint(
            "start_time >= '00:00:00' AND end_time < '24:00:00' "
            "AND end_time > start_time",
            name="ck_work_schedules_time_range",
        ),
        Index("ix_work_schedules_specialist_day", "specialist_id", "day_of_week"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    specialist_id: Mapped[int] = mapped_column(
        ForeignKey("specialists.id", ondelete="CASCADE")
    )
    day_of_week: Mapped[int]
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)

    specialist: Mapped[Specialist] = relationship(back_populates="work_intervals")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        CheckConstraint(
            "start_time >= '00:00:00' AND end_time < '24:00:00' "
            "AND end_time > start_time",
            name="ck_appointments_time_range",
        ),
        CheckConstraint(
            "status IN ('created', 'confirmed', 'completed', 'cancelled')",
            name="ck_appointments_status",
        ),
        Index("ix_appointments_specialist_date", "specialist_id", "appointment_date"),
        Index("ix_appointments_client_date", "client_id", "appointment_date"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    client_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    specialist_id: Mapped[int] = mapped_column(
        ForeignKey("specialists.id", ondelete="RESTRICT")
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="RESTRICT"), index=True
    )
    appointment_date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    status: Mapped[str] = mapped_column(
        String(20), default="created", server_default="created"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None)
    )

    client: Mapped[User] = relationship()
    specialist: Mapped[Specialist] = relationship()
    service: Mapped[Service] = relationship()
