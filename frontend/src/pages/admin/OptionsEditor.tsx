import type { OptionDraft } from "./adminData";
import styles from "./Admin.module.css";

export function OptionsEditor({
  options,
  onChange,
  invalid,
  compact = false,
  serviceEditor = false,
}: {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
  invalid: boolean;
  compact?: boolean;
  serviceEditor?: boolean;
}) {
  const update = (id: number, changes: Partial<OptionDraft>) =>
    onChange(
      options.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  return (
    <div
      className={`${styles.optionEditor} ${compact ? styles.compactOptions : ""}`}
    >
      <h2>{compact ? "Дополнительные параметры" : "Дополнительные опции"}</h2>
      <p className={styles.subtitle}>
        {compact
          ? "Измените стоимость дополнительных опций для услуги"
          : "Стоимость дополнительных параметров услуги"}
      </p>
      <div className={styles.optionList}>
        {options.map((item) => (
          <div className={styles.optionRow} key={item.id}>
            <label>
              {!compact && "Название"}
              <input
                aria-label="Название опции"
                maxLength={150}
                value={item.name}
                onChange={(event) =>
                  update(item.id, { name: event.target.value })
                }
              />
            </label>
            <label>
              {!compact && "Цена, ₽"}
              {compact ? (
                <span className={styles.optionPrice}>
                  <span aria-hidden="true">+</span>
                  <input
                    aria-label={`Цена опции ${item.name || "без названия"}, рублей`}
                    type="number"
                    min={0}
                    max={10000000}
                    step={1}
                    value={item.price}
                    style={{
                      width: `${Math.max(2, Math.min(8, item.price.length || 2))}ch`,
                    }}
                    onChange={(event) =>
                      update(item.id, { price: event.target.value })
                    }
                  />
                  <span aria-hidden="true">₽</span>
                </span>
              ) : (
                <input
                  aria-label={`Цена опции ${item.name || "без названия"}`}
                  type="number"
                  min={0}
                  max={10000000}
                  step={1}
                  value={item.price}
                  onChange={(event) =>
                    update(item.id, { price: event.target.value })
                  }
                />
              )}
            </label>
            <button
              type="button"
              aria-label={`Удалить опцию ${item.name || "без названия"}`}
              onClick={() =>
                onChange(options.filter((option) => option.id !== item.id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {invalid && (
        <p role="alert" className={styles.optionError}>
          Укажите название и целую цену от 0 до 10 000 000 ₽ для каждой опции.
        </p>
      )}
      {(!compact || serviceEditor) && (
        <button
          type="button"
          className={styles.addOption}
          onClick={() =>
            onChange([
              ...options,
              {
                id: Math.max(0, ...options.map((item) => item.id)) + 1,
                name: "",
                price: "",
              },
            ])
          }
        >
          + Добавить опцию
        </button>
      )}
    </div>
  );
}
