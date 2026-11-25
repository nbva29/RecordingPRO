import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button/Button";
import { ServiceCard } from "./ServiceCard";
import { ServiceDialog } from "./ServiceDialog";
import { PriceDialog } from "./PriceDialog";
import { AdminDialog } from "./AdminDialog";
import type { AdminService } from "./adminData";
import { useAdmin } from "./useAdmin";
import styles from "./Admin.module.css";

type DialogState =
  | { mode: "create" }
  | { mode: "edit" | "price" | "delete"; service: AdminService }
  | null;
export function AdminServicesPage() {
  const { data, saveService, setPrice, deleteService } = useAdmin();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<DialogState>(() =>
    params.get("create") === "1" ? { mode: "create" } : null,
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const actionLock = useRef(false);
  async function perform(action: () => Promise<void>, success: string) {
    if (actionLock.current) return;
    actionLock.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      actionLock.current = false;
      closeDialog();
      setMessage(success);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось выполнить действие.",
      );
    } finally {
      actionLock.current = false;
      setPending(false);
    }
  }
  const services = data.data?.services ?? [];
  const categories = data.data?.categories ?? [];
  function closeDialog() {
    if (actionLock.current) return;
    setDialog(null);
    if (params.has("create")) {
      const next = new URLSearchParams(params);
      next.delete("create");
      setParams(next, { replace: true });
    }
  }
  if (
    dialog &&
    (dialog.mode === "create" || dialog.mode === "edit") &&
    data.isSuccess
  )
    return (
      <main className={styles.page}>
        <ServiceDialog
          key={dialog.mode === "edit" ? dialog.service.id : "new"}
          service={dialog.mode === "edit" ? dialog.service : null}
          categories={categories}
          pending={pending}
          error={error}
          onClose={closeDialog}
          onDelete={
            dialog.mode === "edit"
              ? () => {
                  void perform(
                    () => deleteService(dialog.service.id),
                    "Услуга удалена.",
                  );
                }
              : undefined
          }
          onSave={(service, categoryName, specialistIds, newSpecialist) => {
            void perform(
              () =>
                saveService(
                  {
                    ...service,
                    id:
                      service.id ??
                      Math.max(0, ...services.map((item) => item.id)) + 1,
                  },
                  categoryName,
                  specialistIds,
                  newSpecialist,
                ),
              "Услуга сохранена.",
            );
          }}
        />
      </main>
    );
  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>Управление услугами</h1>
          <p className={styles.subtitle}>
            Создавайте, редактируйте и удаляйте услуги
          </p>
        </div>
        <Button
          disabled={!data.isSuccess}
          onClick={() => setDialog({ mode: "create" })}
        >
          + Добавить услугу
        </Button>
      </div>
      {message && (
        <p className={styles.success} role="status">
          {message}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {data.isPending ? (
        <p role="status">Загружаем услуги…</p>
      ) : data.isError ? (
        <div role="alert">
          <p>Не удалось загрузить услуги.</p>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => data.refetch()}
          >
            Повторить
          </button>
        </div>
      ) : services.length ? (
        <section className={styles.serviceTable}>
          <div className={styles.serviceTableHead}>
            <span>Название</span>
            <span>Категория</span>
            <span>Длительность</span>
            <span>Цена</span>
            <span />
          </div>
          <div className={styles.list}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                category={
                  categories.find((item) => item.id === service.categoryId)
                    ?.name ?? "Категория не указана"
                }
                onEdit={() => setDialog({ mode: "edit", service })}
                onPrice={() => setDialog({ mode: "price", service })}
                onDelete={() => setDialog({ mode: "delete", service })}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className={`${styles.empty} ${styles.emptyServices}`}>
          <h2>Услуг пока нет</h2>
          <p>Добавьте первую услугу вашей организации.</p>
        </div>
      )}
      {dialog?.mode === "price" && (
        <PriceDialog
          service={dialog.service}
          organization={data.data?.organization}
          pending={pending}
          error={error}
          onClose={closeDialog}
          onSave={(price, options, details) => {
            void perform(
              () => setPrice(dialog.service.id, price, options, details),
              "Цена сохранена.",
            );
          }}
        />
      )}
      {dialog?.mode === "delete" && (
        <AdminDialog title="Удалить услугу?" onClose={closeDialog}>
          <p>«{dialog.service.name}» будет удалена.</p>
          <div className={styles.dialogActions}>
            <Button variant="secondary" onClick={closeDialog}>
              Отмена
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                void perform(
                  () => deleteService(dialog.service.id),
                  "Услуга удалена.",
                );
              }}
            >
              Удалить услугу
            </Button>
          </div>
        </AdminDialog>
      )}
    </main>
  );
}
