from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.auth import router as auth_router
from app.booking_views import router as booking_views_router
from app.bookings import router as bookings_router
from app.organizations import router as organizations_router
from app.pricing import router as pricing_router
from app.scheduling import router as scheduling_router
from app.services import router as services_router
from app.specialists import router as specialists_router


app = FastAPI(title="ЗаписьПро API", version="0.1.0")
app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(services_router)
app.include_router(specialists_router)
app.include_router(pricing_router)
app.include_router(scheduling_router)
app.include_router(bookings_router)
app.include_router(booking_views_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, exc: RequestValidationError,
) -> JSONResponse:
    # Do not include submitted values, which may contain plaintext passwords.
    errors = [
        {"type": error["type"], "loc": error["loc"], "msg": error["msg"]}
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})
