from email.message import EmailMessage
from smtplib import SMTP, SMTP_SSL
from ssl import create_default_context

from app.config import settings


def send_password_reset_email(email: str, code: str) -> None:
    message = EmailMessage()
    message["Subject"] = "ЗаписьПро — восстановление пароля"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(
        f"Ваш код для восстановления пароля: {code}\n\n"
        "Введите его в форме восстановления вместе с email и новым паролем.\n"
        f"Код действует {settings.password_reset_expire_minutes} минут "
        "и может быть использован один раз. Никому не сообщайте код.\n"
        "Если вы не запрашивали восстановление, проигнорируйте письмо."
    )

    context = create_default_context()
    if settings.smtp_port == 465:
        smtp = SMTP_SSL(
            settings.smtp_host, settings.smtp_port, timeout=10, context=context
        )
    else:
        smtp = SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
    with smtp:
        if settings.smtp_port != 465:
            smtp.starttls(context=context)
        smtp.login(settings.smtp_user, settings.smtp_password.get_secret_value())
        smtp.send_message(message)
