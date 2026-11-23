import { useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { useClient } from "./useClient";
import { validateProfile } from "./clientData";
import styles from "./Client.module.css";

export function ClientProfilePage() {
  const { profile, setProfile } = useClient();
  const [editing, setEditing] = useState(true);
  const [draft, setDraft] = useState(profile);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const errors = submitted ? validateProfile(draft) : {};
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateProfile(draft)).length) return;
    setProfile({
      ...draft,
      name: draft.name.trim(),
      phone: draft.phone.trim(),
    });
    setEditing(false);
    setSubmitted(false);
    setSaved(true);
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
      {saved && (
        <p className={styles.success} role="status">
          Изменения сохранены локально.
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
                <Button type="submit">Сохранить изменения</Button>
                <Button variant="secondary" onClick={cancel}>
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
        <section className={styles.section}>
          <h2>Безопасность</h2>
          <p className={styles.securityText}>
            Управление паролем будет доступно после подключения настроек
            аккаунта.
          </p>
        </section>
      </div>
    </main>
  );
}
