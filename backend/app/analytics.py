from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_admin, get_current_user, require_organization_admin
from app.database import get_db
from app.models import Appointment, Service, Specialist, User
from app.organizations import get_organization
from app.schemas import (
    AppointmentStatisticsCounts,
    ClientStatisticsRead,
    DailyAppointmentStatistics,
    OrganizationStatisticsRead,
    OrganizationStatisticsPercentages,
    PopularServiceRead,
    PreviousStatisticsPeriod,
    StatisticsPeriod,
    StatisticsQuery,
)


router = APIRouter(prefix="/api", tags=["Статистика"])


def resolve_period(
    period_days: StatisticsPeriod,
    today: date,
) -> tuple[date, date]:
    return today - timedelta(days=int(period_days) - 1), today


def percentage(part: int, total: int) -> float:
    return round(part * 100 / total, 1) if total else 0.0


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
        "включены. period_days — последние 7, 30 или 90 календарных дней, включая "
        "сегодня по местному времени backend; по умолчанию 30. "
        "Статусы считаются по значениям в БД. upcoming — активные записи "
        "с началом в будущем, history — все остальные, как в списке своих записей. "
        "При пустом периоде все счётчики равны нулю."
    ),
    responses={401: {"description": "Требуется действительный Bearer-токен"}},
)
def client_statistics(
    period: Annotated[StatisticsQuery, Query()],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ClientStatisticsRead:
    now = datetime.now()
    date_from, date_to = resolve_period(period.period_days, now.date())
    query = select(*count_columns(now)).where(
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
        "period_days — последние 7, 30 или 90 календарных дней, включая сегодня; "
        "по умолчанию 30. "
        "counts включает все статусы; upcoming и history определяются по местному "
        "времени backend, как в списке записей. daily содержит только дни с записями. "
        "unique_clients и топ-10 popular_services не учитывают отменённые записи. "
        "Рейтинг упорядочен по числу записей, при равенстве — по ID услуги. "
        "Статус completed не присваивается автоматически по прошедшей дате. "
        "percentages содержит доли completed и cancelled от total и изменение total "
        "к предыдущему периоду такой же длины, округлённые до одного знака. "
        "Если прошлый total равен нулю, рост с нуля обозначается null; "
        "если оба total равны нулю, изменение равно 0."
    ),
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация не найдена"},
    },
)
def organization_statistics(
    organization_id: int,
    period: Annotated[StatisticsQuery, Query()],
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> OrganizationStatisticsRead:
    now = datetime.now()
    date_from, date_to = resolve_period(period.period_days, now.date())
    get_organization(db, organization_id)
    require_organization_admin(_admin, organization_id)
    columns = count_columns(now)
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
    previous_to = date_from - timedelta(days=1)
    previous_from = date_from - timedelta(days=int(period.period_days))
    previous_total = db.scalar(
        select(func.count())
        .select_from(Appointment)
        .join(Appointment.specialist)
        .where(
            Specialist.organization_id == organization_id,
            Appointment.appointment_date >= previous_from,
            Appointment.appointment_date <= previous_to,
        )
    )
    if previous_total:
        total_change = percentage(totals["total"] - previous_total, previous_total)
    else:
        total_change = None if totals["total"] else 0.0
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
        previous_period=PreviousStatisticsPeriod(
            date_from=previous_from, date_to=previous_to, total=previous_total
        ),
        percentages=OrganizationStatisticsPercentages(
            total_change=total_change,
            completed=percentage(totals["completed"], totals["total"]),
            cancelled=percentage(totals["cancelled"], totals["total"]),
        ),
    )
