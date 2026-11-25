import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/adminApi";
import type { WorkInterval } from "../../api/adminApi";
import { Button } from "../../components/ui/Button/Button";
import { AdminDialog } from "./AdminDialog";
import styles from "./Admin.module.css";

const days = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

export function ScheduleDialog({
  organizationId,
  onClose,
}: {
  organizationId: number;
  onClose: () => void;
}) {
  const specialists = useQuery({
    queryKey: ["admin-specialists", organizationId],
    queryFn: ({ signal }) => adminApi.specialists(organizationId, signal),
    retry: false,
  });
  const [specialistId, setSpecialistId] = useState(0);
  const menu = useRef<HTMLDetailsElement>(null);
  const schedule = useQuery({
    queryKey: ["admin-schedule", organizationId, specialistId],
    queryFn: ({ signal }) => adminApi.schedule(specialistId, signal),
    enabled: specialistId > 0,
    retry: false,
    staleTime: 0,
  });
  return (
    <AdminDialog
      title="Расписание мастеров"
      className={styles.scheduleDialog}
      onClose={onClose}
    >
      {specialists.isPending ? (
        <p role="status">Загружаем мастеров…</p>
      ) : specialists.isError ? (
        <div role="alert">
          <p>Не удалось загрузить мастеров.</p>
          <button type="button" onClick={() => specialists.refetch()}>
            Повторить
          </button>
        </div>
      ) : specialists.data.length === 0 ? (
        <p>Мастеров пока нет. Добавьте мастера в форме услуги.</p>
      ) : (
        <>
          <div className={styles.scheduleSelect}>
            <span>Мастер</span>
            <details
              ref={menu}
              className={styles.scheduleMenu}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  event.currentTarget.open = false;
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary>
                {specialists.data.find((item) => item.id === specialistId)
                  ?.name ?? "Выберите мастера"}
                <span className={styles.scheduleArrow} aria-hidden="true" />
              </summary>
              <div className={styles.scheduleMenuOptions}>
                {specialists.data.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={specialistId === item.id}
                    onClick={() => {
                      setSpecialistId(item.id);
                      if (menu.current) menu.current.open = false;
                      menu.current?.querySelector("summary")?.focus();
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </details>
          </div>
          {specialistId > 0 &&
            (schedule.isPending ? (
              <p role="status">Загружаем расписание…</p>
            ) : schedule.isError ? (
              <div role="alert">
                <p>Не удалось загрузить расписание.</p>
                <button type="button" onClick={() => schedule.refetch()}>
                  Повторить
                </button>
              </div>
            ) : (
              <ScheduleForm
                key={specialistId}
                organizationId={organizationId}
                specialistId={specialistId}
                initial={schedule.data.intervals}
              />
            ))}
        </>
      )}
    </AdminDialog>
  );
}

function ScheduleForm({
  organizationId,
  specialistId,
  initial,
}: {
  organizationId: number;
  specialistId: number;
  initial: WorkInterval[];
}) {
  const [intervals, setIntervals] = useState(() =>
    initial.map((item) => ({
      ...item,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
    })),
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const queryClient = useQueryClient();
  function update(
    index: number,
    field: "start_time" | "end_time",
    value: string,
  ) {
    setIntervals((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
    setMessage("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const sorted = [...intervals].sort(
      (a, b) =>
        a.day_of_week - b.day_of_week ||
        a.start_time.localeCompare(b.start_time),
    );
    if (
      sorted.some(
        (item) =>
          !item.start_time ||
          !item.end_time ||
          item.end_time <= item.start_time,
      )
    ) {
      setError(
        "Укажите время начала и окончания: окончание должно быть позже начала.",
      );
      return;
    }
    if (
      sorted.some(
        (item, index) =>
          index > 0 &&
          item.day_of_week === sorted[index - 1].day_of_week &&
          item.start_time < sorted[index - 1].end_time,
      )
    ) {
      setError("Интервалы одного дня не должны пересекаться.");
      return;
    }
    lock.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await adminApi.saveSchedule(specialistId, sorted);
      queryClient.setQueryData(
        ["admin-schedule", organizationId, specialistId],
        result,
      );
      await queryClient.invalidateQueries({ queryKey: ["booking-slots"] });
      setMessage("Расписание сохранено.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить расписание.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={save} className={styles.scheduleForm}>
      <p className={styles.subtitle}>
        Добавьте рабочие интервалы. Дни без интервалов — выходные.
      </p>
      {days.map((day, dayIndex) => (
        <div className={styles.scheduleDay} key={day}>
          <strong>{day}</strong>
          <div className={styles.scheduleIntervals}>
            {intervals.map(
              (item, index) =>
                item.day_of_week === dayIndex && (
                  <div className={styles.scheduleInterval} key={index}>
                    <label>
                      С{" "}
                      <input
                        type="time"
                        required
                        value={item.start_time}
                        disabled={pending}
                        onChange={(event) =>
                          update(index, "start_time", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      До{" "}
                      <input
                        type="time"
                        required
                        value={item.end_time}
                        disabled={pending}
                        onChange={(event) =>
                          update(index, "end_time", event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Удалить интервал: ${day}, ${item.start_time}–${item.end_time}`}
                      onClick={() => {
                        setIntervals((previous) =>
                          previous.filter((_, i) => i !== index),
                        );
                        setMessage("");
                      }}
                    >
                      ×
                    </button>
                  </div>
                ),
            )}
            <button
              type="button"
              className={styles.textButton}
              disabled={pending}
              onClick={() => {
                setIntervals((previous) => [
                  ...previous,
                  {
                    day_of_week: dayIndex,
                    start_time: "09:00",
                    end_time: "18:00",
                  },
                ]);
                setMessage("");
              }}
            >
              + Добавить интервал
            </button>
          </div>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <div className={styles.dialogActions}>
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить расписание"}
        </Button>
      </div>
    </form>
  );
}
