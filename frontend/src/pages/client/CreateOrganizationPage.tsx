import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { catalogApi } from "../../api/catalogApi";
import { useAuthSession } from "../../auth/authSession";
import { Button } from "../../components/ui/Button/Button";
import styles from "./Client.module.css";

export function CreateOrganizationPage() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const navigate = useNavigate();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    if (!name.trim() || !city.trim() || !address.trim()) {
      setError("Укажите название, город и адрес.");
      return;
    }
    const token = useAuthSession.getState().accessToken;
    if (!token) {
      setError("Войдите в аккаунт заново.");
      return;
    }
    lock.current = true;
    setPending(true);
    setError("");
    try {
      if (!created) {
        await catalogApi.createOrganization({
          name: name.trim(),
          city: city.trim(),
          address: address.trim(),
          description: description.trim() || null,
          phone: phone.trim() || null,
        });
        setCreated(true);
      }
      const user = await authApi.getCurrentUser(token);
      useAuthSession.getState().updateUser(token, user);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось выполнить запрос.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <main className={styles.page}>
      <h1>Создать организацию</h1>
      <p className={styles.subtitle}>
        После создания вы станете её администратором.
      </p>
      <form className={`${styles.section} ${styles.profile}`} onSubmit={submit}>
        <label>
          Название
          <input
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Город
          <input
            value={city}
            maxLength={100}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </label>
        <label>
          Адрес
          <input
            value={address}
            maxLength={255}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <label>
          Описание
          <input
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Телефон
          <input
            type="tel"
            value={phone}
            maxLength={32}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        {created && (
          <p role="status">
            Организация создана. Если переход не произошёл, обновите данные
            аккаунта.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className={styles.profileActions}>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Подождите…"
              : created
                ? "Обновить данные аккаунта"
                : "Создать организацию"}
          </Button>
        </div>
      </form>
    </main>
  );
}
