from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import get_current_admin, require_organization_admin
from app.database import get_db
from app.models import Appointment, Specialist, User, WorkSchedule
from app.schemas import (
    AvailableSlot,
    AvailableSlotsRead,
    ScheduleRead,
    ScheduleReplace,
    WorkInterval,
)
from app.services import get_service
from app.specialists import get_specialist


router = APIRouter(prefix="/api/specialists", tags=["Расписание"])
SLOT_STEP_MINUTES = 15


def build_available_slots(
    target_date: date,
    work_intervals: list[WorkSchedule],
    appointments: list[Appointment],
    duration_minutes: int,
    now: datetime,
) -> list[AvailableSlot]:
    if target_date < now.date():
        return []

    # Adjacent work intervals form one continuous period without a break.
    periods: list[tuple[datetime, datetime]] = []
    for interval in sorted(work_intervals, key=lambda item: item.start_time):
        start = datetime.combine(target_date, interval.start_time)
        end = datetime.combine(target_date, interval.end_time)
        if periods and start <= periods[-1][1]:
            periods[-1] = (periods[-1][0], max(periods[-1][1], end))
        else:
            periods.append((start, end))

    duration = timedelta(minutes=duration_minutes)
    slots = []
    for start, end in periods:
        last_offset = int((end - start - duration).total_seconds())
        for offset in range(0, last_offset + 1, SLOT_STEP_MINUTES * 60):
            slot_start = start + timedelta(seconds=offset)
            slot_end = slot_start + duration
            if slot_start < now:
                continue
            if any(
                slot_start.time() < appointment.end_time
                and slot_end.time() > appointment.start_time
                for appointment in appointments
            ):
                continue
            slots.append(
                AvailableSlot(start_time=slot_start.time(), end_time=slot_end.time())
            )
    return slots


@router.get(
    "/{specialist_id}/slots",
    response_model=AvailableSlotsRead,
    summary="Свободное время специалиста для услуги на выбранную дату",
    description=(
        "Начало записи предлагается с шагом 15 минут от начала рабочего интервала. "
        "Учитываются длительность услуги и все записи специалиста, кроме отменённых. "
        "Услуга должна быть назначена специалисту и доступна для онлайн-записи. "
        "Прошедшее время не показывается. Дата и время — местные для backend; "
        "часовой пояс сервера должен совпадать с часовым поясом организации. "
        "Этот запрос показывает доступность, но не резервирует время."
    ),
    responses={404: {"description": "Специалист или назначенная ему услуга не найдены"}},
)
def read_available_slots(
    specialist_id: int,
    service_id: Annotated[int, Query(gt=0)],
    target_date: Annotated[
        date, Query(alias="date", description="Дата в формате YYYY-MM-DD")
    ],
    db: Annotated[Session, Depends(get_db)],
) -> AvailableSlotsRead:
    specialist = get_specialist(db, specialist_id)
    service = get_service(db, service_id)
    if (
        service.category.organization_id != specialist.organization_id
        or service.id not in {item.id for item in specialist.services}
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Услуга не назначена этому специалисту",
        )

    result = AvailableSlotsRead(
        specialist_id=specialist_id, service_id=service_id, date=target_date, slots=[]
    )
    now = datetime.now()
    if not service.is_available_for_online_booking or target_date < now.date():
        return result

    intervals = list(
        db.scalars(
            select(WorkSchedule).where(
                WorkSchedule.specialist_id == specialist_id,
                WorkSchedule.day_of_week == target_date.weekday(),
            )
        )
    )
    appointments = list(
        db.scalars(
            select(Appointment).where(
                Appointment.specialist_id == specialist_id,
                Appointment.appointment_date == target_date,
                Appointment.status != "cancelled",
            )
        )
    )
    result.slots = build_available_slots(
        target_date, intervals, appointments, service.duration, now
    )
    return result


@router.get(
    "/{specialist_id}/schedule",
    response_model=ScheduleRead,
    summary="Недельный график специалиста",
    responses={404: {"description": "Специалист не найден"}},
)
def read_schedule(
    specialist_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> ScheduleRead:
    if db.get(Specialist, specialist_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Специалист не найден"
        )
    intervals = db.scalars(
        select(WorkSchedule)
        .where(WorkSchedule.specialist_id == specialist_id)
        .order_by(WorkSchedule.day_of_week, WorkSchedule.start_time)
    ).all()
    return ScheduleRead(
        specialist_id=specialist_id,
        intervals=[WorkInterval.model_validate(interval) for interval in intervals],
    )


@router.put(
    "/{specialist_id}/schedule",
    response_model=ScheduleRead,
    summary="Заменить недельный график специалиста",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Специалист не найден"},
    },
)
def replace_schedule(
    specialist_id: int,
    data: ScheduleReplace,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
) -> ScheduleRead:
    # Serialize replacements even when the specialist has no intervals yet.
    specialist = db.scalar(
        select(Specialist).where(Specialist.id == specialist_id).with_for_update()
    )
    if specialist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Специалист не найден"
        )

    require_organization_admin(_admin, specialist.organization_id)
    intervals = sorted(
        data.intervals, key=lambda item: (item.day_of_week, item.start_time)
    )
    db.execute(delete(WorkSchedule).where(WorkSchedule.specialist_id == specialist_id))
    db.add_all(
        WorkSchedule(specialist_id=specialist_id, **interval.model_dump())
        for interval in intervals
    )
    db.commit()
    return ScheduleRead(specialist_id=specialist_id, intervals=intervals)
