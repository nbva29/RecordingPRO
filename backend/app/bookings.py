from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    Appointment,
    Category,
    Service,
    Specialist,
    User,
    WorkSchedule,
    specialist_services,
)
from app.schemas import AppointmentCreate, AppointmentRead
from app.scheduling import build_available_slots


router = APIRouter(prefix="/api/appointments", tags=["Записи"])


@router.post(
    "",
    response_model=AppointmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать и подтвердить запись на услугу",
    description=(
        "Запись создаётся для текущего пользователя со статусом confirmed. "
        "Передайте начало одного из свободных слотов; время окончания вычисляет сервер. "
        "Дата и время приёма — местные для backend, время создания — UTC. "
        "Если слот уже занят или больше недоступен, вернётся 409."
    ),
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        404: {"description": "Специалист или назначенная ему услуга не найдены"},
        409: {"description": "Время или услуга недоступны для онлайн-записи"},
    },
)
def create_appointment(
    data: AppointmentCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AppointmentRead:
    client_id = current_user.id
    # Authentication has only read data. End its snapshot before waiting for the lock,
    # so MySQL REPEATABLE READ sees bookings committed by the previous lock holder.
    db.rollback()
    with db.begin():
        # The same specialist lock also serializes schedule replacements.
        specialist = db.scalar(
            select(Specialist)
            .where(Specialist.id == data.specialist_id)
            .with_for_update()
        )
        if specialist is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Специалист не найден"
            )

        service = db.scalar(
            select(Service)
            .where(Service.id == data.service_id)
            .with_for_update(read=True)
        )
        if service is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена"
            )
        organization_id = db.scalar(
            select(Category.organization_id)
            .where(Category.id == service.category_id)
            .with_for_update(read=True)
        )
        assigned_service = db.scalar(
            select(specialist_services.c.service_id)
            .where(
                specialist_services.c.specialist_id == specialist.id,
                specialist_services.c.service_id == service.id,
            )
            .with_for_update(read=True)
        )
        if organization_id != specialist.organization_id or assigned_service is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Услуга не назначена этому специалисту",
            )
        if not service.is_available_for_online_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Услуга недоступна для онлайн-записи",
            )

        intervals = list(
            db.scalars(
                select(WorkSchedule).where(
                    WorkSchedule.specialist_id == specialist.id,
                    WorkSchedule.day_of_week == data.appointment_date.weekday(),
                )
            )
        )
        appointments = list(
            db.scalars(
                select(Appointment).where(
                    Appointment.specialist_id == specialist.id,
                    Appointment.appointment_date == data.appointment_date,
                    Appointment.status != "cancelled",
                )
            )
        )
        slots = build_available_slots(
            data.appointment_date,
            intervals,
            appointments,
            service.duration,
            datetime.now(),
        )
        selected = next(
            (slot for slot in slots if slot.start_time == data.start_time), None
        )
        if selected is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Выбранное время недоступно. Обновите список свободного времени",
            )

        appointment = Appointment(
            client_id=client_id,
            specialist_id=specialist.id,
            service_id=service.id,
            appointment_date=data.appointment_date,
            start_time=selected.start_time,
            end_time=selected.end_time,
            status="confirmed",
        )
        db.add(appointment)
        db.flush()
        result = AppointmentRead.model_validate(appointment)
    return result
