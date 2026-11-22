from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import get_current_admin
from app.database import get_db
from app.models import Specialist, User, WorkSchedule
from app.schemas import ScheduleRead, ScheduleReplace, WorkInterval


router = APIRouter(prefix="/api/specialists", tags=["Расписание"])


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
