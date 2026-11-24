from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, and_, or_, select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_admin, get_current_user
from app.database import get_db
from app.models import Appointment, Specialist, User
from app.organizations import get_organization
from app.schemas import (
    AdminAppointmentRead,
    AppointmentClientRead,
    AppointmentDetailsRead,
    AppointmentOrganizationRead,
    AppointmentRead,
    AppointmentServiceRead,
    AppointmentSpecialistRead,
    AppointmentStatus,
)


router = APIRouter(prefix="/api", tags=["Просмотр записей"])


def appointment_details(appointment: Appointment) -> AppointmentDetailsRead:
    return AppointmentDetailsRead(
        **AppointmentRead.model_validate(appointment).model_dump(),
        organization=AppointmentOrganizationRead.model_validate(
            appointment.specialist.organization
        ),
        service=AppointmentServiceRead.model_validate(appointment.service),
        specialist=AppointmentSpecialistRead.model_validate(appointment.specialist),
    )


def appointment_query() -> Select[tuple[Appointment]]:
    return select(Appointment).options(
        joinedload(Appointment.specialist).joinedload(Specialist.organization),
        joinedload(Appointment.service),
    )


@router.get(
    "/appointments/me",
    response_model=list[AppointmentDetailsRead],
    summary="Мои записи и история",
    description=(
        "Показывает только записи текущего пользователя. upcoming — активные записи "
        "с началом в будущем; history — все остальные, включая отменённые. "
        "В upcoming сначала ближайшие, в all и history — сначала новые по дате приёма. "
        "Время приёма сравнивается с местным временем backend."
    ),
    responses={401: {"description": "Требуется действительный Bearer-токен"}},
)
def list_my_appointments(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    view: Annotated[Literal["all", "upcoming", "history"], Query()] = "all",
    status_filter: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
) -> list[AppointmentDetailsRead]:
    query = appointment_query().where(Appointment.client_id == current_user.id)
    now = datetime.now()
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
    if view == "upcoming":
        query = query.where(upcoming).order_by(
            Appointment.appointment_date, Appointment.start_time, Appointment.id
        )
    else:
        if view == "history":
            query = query.where(~upcoming)
        query = query.order_by(
            Appointment.appointment_date.desc(),
            Appointment.start_time.desc(),
            Appointment.id,
        )
    if status_filter is not None:
        query = query.where(Appointment.status == status_filter)
    return [appointment_details(item) for item in db.scalars(query).all()]


@router.get(
    "/appointments/{appointment_id}",
    response_model=AppointmentDetailsRead,
    summary="Посмотреть запись по ID",
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Нет доступа к записи"},
        404: {"description": "Запись не найдена"},
    },
)
def read_appointment(
    appointment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AppointmentDetailsRead:
    appointment = db.scalar(appointment_query().where(Appointment.id == appointment_id))
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена"
        )
    if appointment.client_id != current_user.id and current_user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Нет доступа к этой записи"
        )
    return appointment_details(appointment)


@router.get(
    "/organizations/{organization_id}/appointments",
    response_model=list[AdminAppointmentRead],
    summary="Календарь записей организации для администратора",
    description=(
        "Записи за период date_from–date_to, обе даты включены, в порядке даты и времени. "
        "По умолчанию включены все статусы. В каждой записи доступны имя, email "
        "и телефон клиента. Можно выбрать специалиста или статус."
    ),
    responses={
        401: {"description": "Требуется действительный Bearer-токен"},
        403: {"description": "Требуются права администратора"},
        404: {"description": "Организация или её специалист не найдены"},
    },
)
def organization_appointments(
    organization_id: int,
    date_from: date,
    date_to: date,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(get_current_admin)],
    specialist_id: Annotated[int | None, Query(gt=0)] = None,
    status_filter: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
) -> list[AdminAppointmentRead]:
    if date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Дата начала периода должна быть не позже даты окончания",
        )
    get_organization(db, organization_id)
    if specialist_id is not None:
        specialist = db.get(Specialist, specialist_id)
        if specialist is None or specialist.organization_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Специалист не найден в этой организации",
            )
    query = (
        appointment_query()
        .join(Appointment.specialist)
        .options(joinedload(Appointment.client))
        .where(
            Specialist.organization_id == organization_id,
            Appointment.appointment_date >= date_from,
            Appointment.appointment_date <= date_to,
        )
        .order_by(Appointment.appointment_date, Appointment.start_time, Appointment.id)
    )
    if specialist_id is not None:
        query = query.where(Appointment.specialist_id == specialist_id)
    if status_filter is not None:
        query = query.where(Appointment.status == status_filter)
    return [
        AdminAppointmentRead(
            **appointment_details(item).model_dump(),
            client=AppointmentClientRead.model_validate(item.client),
        )
        for item in db.scalars(query).all()
    ]
