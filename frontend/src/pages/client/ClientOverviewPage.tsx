import { Link } from "react-router-dom";
import { useClient } from "./useClient";
import { formatDate, splitBookings } from "./clientData";
import styles from "./Client.module.css";

export function ClientOverviewPage() {
  const { bookings, profile } = useClient();
  const { upcoming, history } = splitBookings(bookings.data ?? []);
  const completed = history.filter((item) => item.status !== "cancelled");
  const name = profile.name || "Клиент";
  return (
    <main className={`${styles.page} ${styles.dashboard}`}>
      <div className={styles.pageHeading}>
        <div>
          <h1>Здравствуйте, {name}!</h1>
          <p className={styles.subtitle}>
            Ваши записи и любимые организации в одном месте
          </p>
        </div>
        <Link className={styles.primaryLink} to="/search">
          + Записаться на услугу
        </Link>
      </div>
      {bookings.isPending ? (
        <p role="status">Загружаем записи…</p>
      ) : bookings.isError ? (
        <div role="alert">
          <p>Не удалось загрузить записи.</p>
          <button
            className={styles.textButton}
            onClick={() => bookings.refetch()}
          >
            Повторить
          </button>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            <article>
              <span>Предстоящие записи</span>
              <strong>{upcoming.length}</strong>
              <small>
                {upcoming[0]
                  ? `Ближайшая — ${formatDate(upcoming[0].date)}`
                  : "Записей пока нет"}
              </small>
            </article>
            <article>
              <span>Завершённые визиты</span>
              <strong>{completed.length}</strong>
              <Link to="/client/bookings#history">История посещений</Link>
            </article>
            <article>
              <span>Любимые организации</span>
              <strong>—</strong>
              <small>Раздел пока недоступен</small>
            </article>
          </div>
          <div className={styles.dashboardGrid}>
            <section className={styles.dashboardSection}>
              <h2>Предстоящие записи</h2>
              {upcoming.length ? (
                <div className={styles.dashboardList}>
                  {upcoming.slice(0, 2).map((item) => (
                    <article className={styles.dashboardBooking} key={item.id}>
                      <div>
                        <h3>{item.service}</h3>
                        <p>
                          {item.organization} · {item.specialist}
                        </p>
                        <strong>
                          {formatDate(item.date)} · {item.time}
                        </strong>
                      </div>
                      <Link
                        to={`/client/bookings?details=${encodeURIComponent(item.id)}`}
                      >
                        Подробнее →
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.empty}>
                  <p>Предстоящих записей пока нет.</p>
                  <Link className={styles.inlineLink} to="/search">
                    Записаться на услугу →
                  </Link>
                </div>
              )}
              <Link
                className={`${styles.inlineLink} ${styles.allBookingsLink}`}
                to="/client/bookings"
              >
                Все мои записи →
              </Link>
            </section>
            <aside className={styles.dashboardSection}>
              <h2>Ваш профиль</h2>
              <div className={styles.profileIdentity}>
                <span className={styles.profileAvatar}>
                  {name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{name}</strong>
                  <small>Клиент</small>
                </div>
              </div>
              <div className={styles.profileInfo}>
                <span>Email</span>
                <p>{profile.email}</p>
                <span>Телефон</span>
                <p>{profile.phone || "Не указан"}</p>
              </div>
              <Link className={styles.outlineLink} to="/client/profile">
                Редактировать профиль
              </Link>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
