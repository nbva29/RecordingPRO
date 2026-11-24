import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { useClient } from "./useClient";
import { validateProfile } from "./clientData";
import { authApi } from "../../api/authApi";
import { useAuthSession } from "../../auth/authSession";
import styles from "./Client.module.css";

export function ClientProfilePage() {
  const { profileQuery } = useClient();
  if (profileQuery.isPending)
    return (
      <main className={styles.page}>
        <p role="status">Загружаем профиль…</p>
      </main>
    );
  if (profileQuery.isError)
    return (
      <main className={styles.page}>
        <div role="alert">
          <p>Не удалось загрузить профиль.</p>
          <button type="button" onClick={() => profileQuery.refetch()}>
            Повторить
          </button>
        </div>
      </main>
    );
  return <ProfileForm />;
}

function ProfileForm() {
  const { profile, profileQuery, saveProfile } = useClient();
  const [editing, setEditing] = useState(true);
  const [draft, setDraft] = useState(profile);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveLock = useRef(false);
  const errors = submitted ? validateProfile(draft) : {};
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveLock.current) return;
    setSubmitted(true);
    if (Object.keys(validateProfile(draft)).length) return;
    saveLock.current = true;
    try {
      await saveProfile.mutateAsync(draft);
      setEditing(false);
      setSubmitted(false);
      setSaved(true);
    } catch {
      /* Mutation error is displayed below. */
    } finally {
      saveLock.current = false;
    }
  }
  function cancel() {
    setDraft(profile);
    setEditing(false);
    setSubmitted(false);
  }
  const name = profile.name || "Клиент";
  return (
    <main className={`${styles.page} ${styles.profilePage}`}>
      <h1>Профиль</h1>
      <p className={styles.subtitle}>Личные данные и настройки аккаунта</p>
      {saveProfile.isError && (
        <p role="alert">
          {saveProfile.error instanceof Error
            ? saveProfile.error.message
            : "Не удалось сохранить профиль."}
        </p>
      )}
      {saved && (
        <p className={styles.success} role="status">
          Изменения сохранены.
        </p>
      )}
      <section className={styles.profileBanner}>
        <span className={styles.profileAvatar}>
          {name.charAt(0).toUpperCase()}
        </span>
        <div>
          <h2>{name}</h2>
          <span>Клиент</span>
        </div>
      </section>
      <div className={styles.profileGrid}>
        <form
          className={`${styles.section} ${styles.profile}`}
          noValidate
          onSubmit={save}
        >
          <div className={styles.sectionHeader}>
            <div>
              <h2>Личные данные</h2>
              <p>Эти данные используются для записей и связи с вами</p>
            </div>
          </div>
          <label>
            Имя и фамилия
            <input
              value={editing ? draft.name : profile.name}
              readOnly={!editing}
              autoComplete="name"
              maxLength={100}
              aria-invalid={!!errors.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="Укажите имя"
            />
            {errors.name && <span role="alert">{errors.name}</span>}
          </label>
          <div className={styles.profileFields}>
            <label>
              Email
              <input
                value={profile.email}
                readOnly
                type="email"
                autoComplete="email"
              />
              <small>Email указан в учётной записи</small>
            </label>
            <label>
              Телефон
              <input
                value={editing ? draft.phone : profile.phone}
                readOnly={!editing}
                autoComplete="tel"
                type="tel"
                maxLength={32}
                aria-invalid={!!errors.phone}
                onChange={(event) =>
                  setDraft({ ...draft, phone: event.target.value })
                }
                placeholder="Укажите телефон"
              />
              {errors.phone && <span role="alert">{errors.phone}</span>}
            </label>
          </div>
          <div className={styles.profileActions}>
            {editing ? (
              <>
                <Button
                  type="submit"
                  disabled={saveProfile.isPending || !profileQuery.isSuccess}
                >
                  {saveProfile.isPending ? "Сохраняем…" : "Сохранить изменения"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={saveProfile.isPending}
                  onClick={cancel}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  setDraft(profile);
                  setSaved(false);
                  setEditing(true);
                }}
              >
                Редактировать
              </Button>
            )}
          </div>
        </form>
        <PasswordForm />
      </div>
    </main>
  );
}

function PasswordForm() {
  const token = useAuthSession((state) => state.accessToken);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const lock = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    setSuccess(false);
    if (!current || current.length > 128) {
      setError("Введите текущий пароль длиной до 128 символов.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Новый пароль должен содержать от 8 до 128 символов.");
      return;
    }
    if (password !== confirmation) {
      setError("Новый пароль и подтверждение не совпадают.");
      return;
    }
    if (!token) {
      setError("Войдите в аккаунт заново.");
      return;
    }
    lock.current = true;
    setPending(true);
    try {
      await authApi.changePassword(token, current, password);
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сменить пароль.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <form
      className={`${styles.section} ${styles.profile} ${styles.securityForm}`}
      onSubmit={submit}
      noValidate
    >
      <h2>Безопасность</h2>
      <label>
        Текущий пароль
        <input
          type="password"
          autoComplete="current-password"
          maxLength={128}
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </label>
      <label>
        Новый пароль
        <input
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label>
        Подтверждение пароля
        <input
          type="password"
          autoComplete="new-password"
          maxLength={128}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className={styles.passwordError}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" className={styles.passwordSuccess}>
          Пароль изменён.
        </p>
      )}
      <div className={styles.securityActions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сменить пароль"}
        </Button>
      </div>
    </form>
  );
}
