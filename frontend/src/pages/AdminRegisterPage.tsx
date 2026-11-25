import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { Button } from "../components/ui/Button/Button";
import { AuthInput } from "../components/auth/AuthInput";
import styles from "../components/auth/AuthForm.module.css";

export function AdminRegisterPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const data = new FormData(event.currentTarget);
    const value = (name: string) => String(data.get(name) ?? "");
    const password = value("password");
    const name = value("name").trim(),
      organizationName = value("organization").trim(),
      city = value("city").trim(),
      address = value("address").trim();
    if (!name || !organizationName || !city || !address) {
      setError("Заполните имя и данные организации.");
      return;
    }
    if (password !== value("confirmation")) {
      setError("Пароли не совпадают.");
      return;
    }
    setError("");
    locked.current = true;
    setPending(true);
    try {
      const user = await authApi.registerAdmin({
        email: value("email"),
        password,
        name,
        phone: value("phone"),
        organization: { name: organizationName, city, address },
      });
      navigate("/admin/login", {
        replace: true,
        state: { registrationComplete: true, email: user.email },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось создать аккаунт.",
      );
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return (
    <section className={`${styles.card} ${styles.registration}`}>
      <h1 className={styles.title}>Регистрация администратора</h1>
      <p className={styles.subtitle}>Создайте аккаунт и организацию</p>
      <form onSubmit={submit}>
        <fieldset className={styles.fields} disabled={pending}>
          <div className={styles.inputs}>
            <AuthInput
              label="Имя"
              name="name"
              maxLength={100}
              autoComplete="name"
              required
            />
            <AuthInput
              label="Email"
              name="email"
              type="email"
              maxLength={254}
              autoComplete="email"
              required
            />
            <AuthInput
              label="Телефон"
              name="phone"
              type="tel"
              maxLength={32}
              autoComplete="tel"
            />
            <AuthInput
              label="Пароль"
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <AuthInput
              label="Подтверждение пароля"
              name="confirmation"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <AuthInput
              label="Название организации"
              name="organization"
              maxLength={150}
              required
            />
            <AuthInput label="Город" name="city" maxLength={100} required />
            <AuthInput label="Адрес" name="address" maxLength={255} required />
          </div>
          <label className={styles.consent}>
            <input type="checkbox" required />
            <span>
              Я принимаю условия использования и политику конфиденциальности
            </span>
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button className={styles.submit} type="submit" disabled={pending}>
            {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
          </Button>
        </fieldset>
      </form>
      <p className={styles.footer}>
        <span>Уже есть аккаунт?</span>
        <Link to="/admin/login">Войти</Link>
      </p>
    </section>
  );
}
