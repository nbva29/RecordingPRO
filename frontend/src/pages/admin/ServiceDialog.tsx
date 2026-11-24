import { useState } from "react";
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
}: {
  service: AdminService | null;
  categories: { id: number; name: string }[];
  onSave: (
    service: Omit<AdminService, "id"> & { id?: number },
    categoryName: string,
  ) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
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
    if (Object.keys(validateService(parsed)).length || !parsedOptions) return;
    onSave({ ...parsed, id: service?.id }, categoryName.trim());
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
                    disabled={!!service}
                    maxLength={150}
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
                Адрес
                <input
                  maxLength={255}
                  value={draft.address ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, address: e.target.value })
                  }
                />
              </label>
              <label>
                Мастер
                <input
                  maxLength={150}
                  value={draft.specialist ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, specialist: e.target.value })
                  }
                />
              </label>
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
            <label className={styles.switchRow}>
              Показывать старую цену
              <input
                className={styles.switchInput}
                type="checkbox"
                checked={!!draft.showOldPrice}
                onChange={(e) =>
                  setDraft({ ...draft, showOldPrice: e.target.checked })
                }
              />
              <span className={styles.switchTrack} aria-hidden="true" />
            </label>
            <p className={styles.switchHint}>
              Клиент увидит скидку в карточке услуги
            </p>
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
            <Button type="submit">Сохранить услугу</Button>
            <Button variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            {service && onDelete && (
              <button
                type="button"
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
          <p>Услуга будет удалена из локального списка.</p>
          <div className={styles.dialogActions}>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button onClick={onDelete}>Удалить</Button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
