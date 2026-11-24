from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user
from app.database import get_db
from app.models import Appointment, Service, Specialist, User
from app.organizations import get_organization
from app.schemas import (
    AppointmentStatisticsCounts,
    ClientStatisticsRead,
    DailyAppointmentStatistics,
    OrganizationStatisticsRead,
    PopularServiceRead,
)


router = APIRouter(prefix="/api", tags=["Статистика"])


def validate_period(date_from: date, date_to: date) -> None:
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Дата начала периода должна быть не позже даты окончания",
        )


def count_columns(now: datetime):
    upcoming = and_(
        Appointment.status.in_(("created", "confirmed")),
        or_(
            Appointment.appointment_date > now.date(),
            and_(
                Appointment.appointment_date == now.date(),
                Appointment.start_time > now.time(),
            ),
        ),
    )
    return [
        func.count().label("total"),
        *[
            func.count(case((Appointment.status == value, 1))).label(value)
            for value in ("created", "confirmed", "completed", "cancelled")
        ],
        func.count(case((upcoming, 1))).label("upcoming"),
        func.count(case((~upcoming, 1))).label("history"),
    ]


@router.get(
    "/appointments/me/statistics",
    response_model=ClientStatisticsRead,
    summary="Моя статистика записей за период",
    description=(
        "Только записи текущего пользователя по дате приёма, обе границы периода "
        "включены. Статусы считаются по значениям в БД. upcoming — активные записи "
        "с началом в будущем, history — все остальные, как в списке своих записей. "
        "При пустом периоде все счётчики равны нулю."
    ),
    responses={401: {"description": "Требуется действительный Bearer-токен"}},
)
def client_statistics(
    date_from: date,
    date_to: date,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ClientStatisticsRead:
    validate_period(date_from, date_to)
    query = select(*count_columns(datetime.now())).where(
        Appointment.client_id == current_user.id,
        Appointment.appointment_date >= date_from,
        Appointment.appointment_date <= date_to,
    )
    counts = db.execute(query).mappings().one()
    return ClientStatisticsRead(
        date_from=date_from,
        date_to=date_to,
        counts=AppointmentStatisticsCounts.model_validate(counts),
    )


@router.get(
    "/organizations/{organization_id}/statistics",
    response_model=OrganizationStatisticsRead,
    summary="Статистика организации за период",
    description=(
        "Доступно администратору. Период задаётся по дате приёма, обе границы включены. "
        "counts включает все статусы; upcoming и history определяются по местному "
        "времени backend, как в списке записей. daily содержит только дни с записями. "
        "unique_clients и топ-10 popular_services не учитывают отменённые записи. "
        "Рейтинг упорядочен по числу записей, при равенстве — по ID услуги. "
        "Статус completed не присваивается автоматически по прошедшей дате."
    ),
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация не найдена"},
    },
)
def organization_statistics(
    organization_id: int,
    date_from: date,
    date_to: date,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> OrganizationStatisticsRead:
    validate_period(date_from, date_to)
    get_organization(db, organization_id)
    columns = count_columns(datetime.now())
    query = (
        select(*columns)
        .select_from(Appointment)
        .join(Appointment.specialist)
        .where(
            Specialist.organization_id == organization_id,
            Appointment.appointment_date >= date_from,
            Appointment.appointment_date <= date_to,
        )
    )
    totals = db.execute(
        query.add_columns(
            func.count(func.distinct(
                case((Appointment.status != "cancelled", Appointment.client_id))
            )).label("unique_clients")
        )
    ).mappings().one()
    daily = db.execute(
        query.with_only_columns(Appointment.appointment_date.label("date"), *columns)
        .group_by(Appointment.appointment_date)
        .order_by(Appointment.appointment_date)
    ).mappings().all()
    popular = db.execute(
        query.with_only_columns(
            Service.id.label("service_id"),
            Service.name,
            func.count().label("appointments_count"),
        )
        .join(Appointment.service)
        .where(Appointment.status != "cancelled")
        .group_by(Service.id, Service.name)
        .order_by(func.count().desc(), Service.id)
        .limit(10)
    ).mappings().all()
    return OrganizationStatisticsRead(
        organization_id=organization_id,
        date_from=date_from,
        date_to=date_to,
        counts=AppointmentStatisticsCounts.model_validate(totals),
        unique_clients=totals["unique_clients"],
        daily=[DailyAppointmentStatistics.model_validate(row) for row in daily],
        popular_services=[PopularServiceRead.model_validate(row) for row in popular],
    )
