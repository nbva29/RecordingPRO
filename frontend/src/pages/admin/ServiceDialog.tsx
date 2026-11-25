import { useAuthSession } from "../../auth/authSession";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/adminApi";
import { Button } from "../../components/ui/Button/Button";
import { parseOptions, validateService } from "./adminData";
import type { AdminService } from "./adminData";
import { OptionsEditor } from "./OptionsEditor";
import { AdminDialog } from "./AdminDialog";
import styles from "./Admin.module.css";

type Draft = Omit<AdminService, "price" | "duration" | "discountPercent"> & {
  price: string;
  duration: string;
  discountPercent: string;
};
export function ServiceDialog({
  service,
  categories,
  onSave,
  onClose,
  onDelete,
  pending = false,
  error = "",
}: {
  service: AdminService | null;
  categories: { id: number; name: string }[];
  onSave: (
    service: Omit<AdminService, "id"> & { id?: number },
    categoryName: string,
    specialistIds: number[],
    newSpecialist: string,
  ) => void;
  onClose: () => void;
  onDelete?: () => void;
  pending?: boolean;
  error?: string;
}) {
  const organizationId =
    useAuthSession((state) => state.user?.organization_id) ?? 0;
  const [draft, setDraft] = useState<Draft>(() => ({
    id: service?.id ?? 0,
    name: service?.name ?? "",
    categoryId: service?.categoryId ?? 0,
    description: service?.description ?? "",
    price: service ? String(service.price) : "",
    duration: service ? String(service.duration) : "",
    discountPercent: service ? String(service.discountPercent) : "0",
    online: service?.online ?? true,
    address: service?.address ?? "",
    specialist: service?.specialist ?? "",
    showOldPrice: service?.showOldPrice ?? false,
    oldPrice: service?.oldPrice,
    minPrice: service?.minPrice,
    maxPrice: service?.maxPrice,
  }));
  const [categoryName, setCategoryName] = useState(
    () =>
      categories.find((item) => item.id === service?.categoryId)?.name ?? "",
  );
  const [submitted, setSubmitted] = useState(false);
  const specialists = useQuery({
    queryKey: ["admin-specialists", organizationId],
    queryFn: ({ signal }) => adminApi.specialists(organizationId, signal),
    retry: false,
  });
  const [chosen, setChosen] = useState<number[] | null>(null);
  const [newSpecialist, setNewSpecialist] = useState("");
  const selectedIds =
    chosen ??
    specialists.data
      ?.filter((item) => service && item.service_ids.includes(service.id))
      .map((item) => item.id) ??
    [];
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [options, setOptions] = useState(() =>
    (service?.options ?? []).map((item) => ({
      ...item,
      price: String(item.price),
    })),
  );
  const parsedOptions = parseOptions(options);
  const parsed: AdminService = {
    ...draft,
    categoryId: categoryName.trim() ? draft.categoryId || 1 : 0,
    options: parsedOptions ?? [],
    price: draft.price.trim() ? Number(draft.price) : NaN,
    duration: draft.duration.trim() ? Number(draft.duration) : NaN,
    discountPercent: draft.discountPercent.trim()
      ? Number(draft.discountPercent)
      : NaN,
  };
  const errors = submitted ? validateService(parsed) : {};
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (
      Object.keys(validateService(parsed)).length ||
      !parsedOptions ||
      !specialists.isSuccess
    )
      return;
    onSave(
      { ...parsed, id: service?.id },
      categoryName.trim(),
      selectedIds,
      newSpecialist.trim(),
    );
  }
  const finalPrice =
    Number.isInteger(parsed.price) &&
    parsed.price >= 0 &&
    Number.isInteger(parsed.discountPercent) &&
    parsed.discountPercent >= 0 &&
    parsed.discountPercent <= 100
      ? parsed.price - Math.floor((parsed.price * parsed.discountPercent) / 100)
      : null;
  return (
    <div className={styles.serviceEditor}>
      <h1>
        {service
          ? "Редактирование услуги"
          : "Добавление услуги и ценообразование"}
      </h1>
      <form
        className={`${styles.form} ${styles.editorGrid}`}
        noValidate
        onSubmit={save}
      >
        <div className={styles.editorMain}>
          <section className={styles.section}>
            <h2>Основная информация</h2>
            <p className={styles.subtitle}>
              Данные, которые клиент увидит в карточке услуги
            </p>
            <div className={styles.editorFields}>
              <label>
                Название услуги
                <input
                  maxLength={150}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <span role="alert">{errors.name}</span>}
              </label>
              <div className={styles.formRow}>
                <label>
                  Категория
                  <input
                    value={categoryName}
                    maxLength={100}
                    onChange={(e) => setCategoryName(e.target.value)}
                    aria-invalid={!!errors.categoryId}
                  />
                  {errors.categoryId && (
                    <span role="alert">{errors.categoryId}</span>
                  )}
                </label>
                <label>
                  Длительность, мин
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    step={1}
                    value={draft.duration}
                    onChange={(e) =>
                      setDraft({ ...draft, duration: e.target.value })
                    }
                    aria-invalid={!!errors.duration}
                  />
                  {errors.duration && (
                    <span role="alert">{errors.duration}</span>
                  )}
                </label>
              </div>
              <label>
                Описание
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <fieldset
                className={styles.specialistSelection}
                disabled={pending}
              >
                <legend>Мастера услуги</legend>
                {specialists.isPending ? (
                  <p role="status">Загружаем мастеров…</p>
                ) : specialists.isError ? (
                  <div role="alert">
                    <p>Не удалось загрузить мастеров.</p>
                    <button type="button" onClick={() => specialists.refetch()}>
                      Повторить
                    </button>
                  </div>
                ) : (
                  <>
                    {specialists.data.length === 0 && <p>Мастеров пока нет.</p>}
                    {specialists.data.map((item) => (
                      <label key={item.id} className={styles.specialistChoice}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(event) =>
                            setChosen(
                              event.target.checked
                                ? [...selectedIds, item.id]
                                : selectedIds.filter((id) => id !== item.id),
                            )
                          }
                        />
                        {item.name}
                      </label>
                    ))}
                    <label>
                      Добавить нового мастера
                      <input
                        maxLength={150}
                        value={newSpecialist}
                        onChange={(event) =>
                          setNewSpecialist(event.target.value)
                        }
                        placeholder="Имя мастера"
                      />
                    </label>
                  </>
                )}
              </fieldset>
            </div>
          </section>
          <section className={styles.section}>
            <OptionsEditor
              options={options}
              onChange={setOptions}
              invalid={submitted && !parsedOptions}
              compact
              serviceEditor
            />
          </section>
        </div>
        <aside className={styles.editorSide}>
          <section className={styles.section}>
            <h2>Ценообразование</h2>
            <p className={styles.subtitle}>Настройка базовой цены и скидок</p>
            <div className={`${styles.formRow} ${styles.editorFields}`}>
              <label>
                Базовая цена, ₽
                <input
                  type="number"
                  min={0}
                  max={10000000}
                  step={1}
                  value={draft.price}
                  onChange={(e) =>
                    setDraft({ ...draft, price: e.target.value })
                  }
                  aria-invalid={!!errors.price}
                />
                {errors.price && <span role="alert">{errors.price}</span>}
              </label>
              <label>
                Скидка, %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={draft.discountPercent}
                  onChange={(e) =>
                    setDraft({ ...draft, discountPercent: e.target.value })
                  }
                  aria-invalid={!!errors.discountPercent}
                />
                {errors.discountPercent && (
                  <span role="alert">{errors.discountPercent}</span>
                )}
              </label>
            </div>
            <div className={styles.pricePreview}>
              <span>Итоговая цена для клиента</span>
              <strong>
                {finalPrice == null
                  ? "—"
                  : `${finalPrice.toLocaleString("ru-RU")} ₽`}
                {draft.showOldPrice &&
                  finalPrice !== null &&
                  parsed.discountPercent > 0 && (
                    <del className={styles.oldPrice}>
                      {parsed.price.toLocaleString("ru-RU")} ₽
                    </del>
                  )}
              </strong>
            </div>
          </section>
          <div className={`${styles.section} ${styles.onlineBox}`}>
            <label className={styles.switchRow}>
              Онлайн-запись доступна
              <input
                className={styles.switchInput}
                type="checkbox"
                checked={draft.online}
                onChange={(e) =>
                  setDraft({ ...draft, online: e.target.checked })
                }
              />
              <span className={styles.switchTrack} aria-hidden="true" />
            </label>
          </div>
          <div className={styles.dialogActions}>
            {error && <p role="alert">{error}</p>}
            <Button type="submit" disabled={pending || !specialists.isSuccess}>
              {pending ? "Сохраняем…" : "Сохранить услугу"}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={onClose}>
              Отмена
            </Button>
            {service && onDelete && (
              <button
                type="button"
                disabled={pending}
                className={styles.deleteService}
                onClick={() => setConfirmDelete(true)}
              >
                Удалить
              </button>
            )}
          </div>
        </aside>
      </form>
      {confirmDelete && onDelete && (
        <AdminDialog
          title="Удалить услугу?"
          onClose={() => setConfirmDelete(false)}
        >
          <p>Услуга будет удалена.</p>
          <div className={styles.dialogActions}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            {error && <p role="alert">{error}</p>}
            <Button disabled={pending} onClick={onDelete}>
              Удалить
            </Button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
