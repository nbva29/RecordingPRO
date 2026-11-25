from datetime import date, datetime, time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_organization_admin
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
from app.schemas import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentReschedule,
    AvailableSlot,
)
from app.scheduling import build_available_slots


router = APIRouter(prefix="/api/appointments", tags=["Записи"])


def get_bookable_service(
    db: Session, specialist: Specialist, service_id: int
) -> Service:
    service = db.scalar(
        select(Service).where(Service.id == service_id).with_for_update(read=True)
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
    return service


def select_available_slot(
    db: Session,
    specialist_id: int,
    service: Service,
    target_date: date,
    start_time: time,
    exclude_appointment_id: UUID | None = None,
) -> AvailableSlot:
    intervals = list(
        db.scalars(
            select(WorkSchedule).where(
                WorkSchedule.specialist_id == specialist_id,
                WorkSchedule.day_of_week == target_date.weekday(),
            )
        )
    )
    query = select(Appointment).where(
        Appointment.specialist_id == specialist_id,
        Appointment.appointment_date == target_date,
        Appointment.status != "cancelled",
    )
    if exclude_appointment_id is not None:
        query = query.where(Appointment.id != exclude_appointment_id)
    appointments = list(db.scalars(query))
    slots = build_available_slots(
        target_date, intervals, appointments, service.duration, datetime.now()
    )
    selected = next((slot for slot in slots if slot.start_time == start_time), None)
    if selected is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Выбранное время недоступно. Обновите список свободного времени",
        )
    return selected


def lock_owned_appointment(
    db: Session, appointment_id: UUID, current_user: User
) -> tuple[Appointment, Specialist]:
    reference = db.execute(
        select(Appointment.client_id, Appointment.specialist_id)
        .where(Appointment.id == appointment_id)
    ).one_or_none()
    if reference is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена"
        )
    if reference.client_id != current_user.id:
        specialist = db.get(Specialist, reference.specialist_id)
        if specialist is None:
            raise HTTPException(status_code=404, detail="Специалист не найден")
        require_organization_admin(current_user, specialist.organization_id)
    specialist_id = reference.specialist_id
    # Specialist and client IDs never change when cancelling or rescheduling.
    # Reset the authentication snapshot, then lock in the same order as creation.
    db.rollback()
    specialist = db.scalar(
        select(Specialist).where(Specialist.id == specialist_id).with_for_update()
    )
    appointment = db.get(Appointment, appointment_id)
    if specialist is None or appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена"
        )
    return appointment, specialist


def check_appointment_changeable(appointment: Appointment) -> None:
    if appointment.status not in ("created", "confirmed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Изменять можно только активную запись",
        )
    if datetime.combine(appointment.appointment_date, appointment.start_time) <= datetime.now():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя изменять запись после начала приёма",
        )


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

        service = get_bookable_service(db, specialist, data.service_id)
        selected = select_available_slot(
            db, specialist.id, service, data.appointment_date, data.start_time
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


@router.post(
    "/{appointment_id}/cancel",
    response_model=AppointmentRead,
    summary="Отменить запись",
    description=(
        "Клиент отменяет свои записи, администратор — любые. "
        "Активную запись можно отменить до начала приёма. "
        "Повторная отмена возвращает ту же запись со статусом cancelled."
    ),
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Нет доступа к записи"},
        404: {"description": "Запись не найдена"},
        409: {"description": "Запись уже началась или завершена"},
    },
)
def cancel_appointment(
    appointment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AppointmentRead:
    appointment, _specialist = lock_owned_appointment(db, appointment_id, current_user)
    if appointment.status != "cancelled":
        check_appointment_changeable(appointment)
        appointment.status = "cancelled"
    db.flush()
    result = AppointmentRead.model_validate(appointment)
    db.commit()
    return result


@router.post(
    "/{appointment_id}/reschedule",
    response_model=AppointmentRead,
    summary="Перенести запись на другую дату или время",
    description=(
        "Клиент переносит свои записи, администратор — любые. "
        "Перенос доступен до начала активной записи. Услуга и специалист сохраняются. "
        "Новое время выбирается из слотов с шагом 15 минут; окончание рассчитывается "
        "по текущей длительности услуги. При конфликте прежняя запись сохраняется."
    ),
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Нет доступа к записи"},
        404: {"description": "Запись, специалист или назначенная услуга не найдены"},
        409: {"description": "Запись нельзя перенести или выбранное время недоступно"},
    },
)
def reschedule_appointment(
    appointment_id: UUID,
    data: AppointmentReschedule,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AppointmentRead:
    appointment, specialist = lock_owned_appointment(db, appointment_id, current_user)
    check_appointment_changeable(appointment)
    service = get_bookable_service(db, specialist, appointment.service_id)
    selected = select_available_slot(
        db,
        specialist.id,
        service,
        data.appointment_date,
        data.start_time,
        exclude_appointment_id=appointment.id,
    )
    appointment.appointment_date = data.appointment_date
    appointment.start_time = selected.start_time
    appointment.end_time = selected.end_time
    db.flush()
    result = AppointmentRead.model_validate(appointment)
    db.commit()
    return result
