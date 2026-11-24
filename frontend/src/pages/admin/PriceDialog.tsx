import { useState } from "react";
import { Button } from "../../components/ui/Button/Button";
import { AdminDialog } from "./AdminDialog";
import { parseOptions } from "./adminData";
import type { AdminOption, AdminService, PriceDetails } from "./adminData";
import { OptionsEditor } from "./OptionsEditor";
import styles from "./Admin.module.css";

export function PriceDialog({
  service,
  organization,
  onSave,
  onClose,
}: {
  service: AdminService;
  organization?: string;
  onSave: (
    price: number,
    options: AdminOption[],
    details: PriceDetails,
  ) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(service.price));
  const [discount, setDiscount] = useState(String(service.discountPercent));
  const [oldPrice, setOldPrice] = useState(
    service.oldPrice == null ? String(service.price) : String(service.oldPrice),
  );
  const [minPrice, setMinPrice] = useState(
    service.minPrice == null ? "" : String(service.minPrice),
  );
  const [maxPrice, setMaxPrice] = useState(
    service.maxPrice == null ? "" : String(service.maxPrice),
  );
  const [options, setOptions] = useState(() =>
    (service.options ?? []).map((item) => ({
      ...item,
      price: String(item.price),
    })),
  );
  const [submitted, setSubmitted] = useState(false);
  const price = value.trim() ? Number(value) : NaN;
  const discountPercent = discount.trim() ? Number(discount) : NaN;
  const optionalNumber = (text: string) => (text.trim() ? Number(text) : null);
  const details: PriceDetails = {
    discountPercent,
    oldPrice: optionalNumber(oldPrice),
    minPrice: optionalNumber(minPrice),
    maxPrice: optionalNumber(maxPrice),
  };
  const isMoneyInvalid = (number: number | null) =>
    number !== null &&
    (!Number.isInteger(number) || number < 0 || number > 10_000_000);
  const invalidPrice =
    !Number.isInteger(price) || price < 0 || price > 10_000_000;
  const invalidDiscount =
    !Number.isInteger(discountPercent) ||
    discountPercent < 0 ||
    discountPercent > 100;
  const invalidDetails = [
    details.oldPrice,
    details.minPrice,
    details.maxPrice,
  ].some(isMoneyInvalid);
  const parsedOptions = parseOptions(options);
  function addOption() {
    setOptions((previous) => [
      ...previous,
      {
        id: Math.max(0, ...previous.map((item) => item.id)) + 1,
        name: "",
        price: "",
      },
    ]);
  }
  return (
    <AdminDialog
      title="Редактирование цены"
      onClose={onClose}
      className={styles.priceDialog}
    >
      <p className={styles.priceSubtitle}>
        Измените стоимость услуги и настройте отображение цены для клиента
      </p>
      <div className={styles.priceService}>
        <span>₽</span>
        <div>
          <strong>{service.name}</strong>
          <small>
            {[organization, service.specialist].filter(Boolean).join(" · ") ||
              "Услуга организации"}
          </small>
        </div>
      </div>
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (
            !invalidPrice &&
            !invalidDiscount &&
            !invalidDetails &&
            parsedOptions
          )
            onSave(price, parsedOptions, details);
        }}
      >
        <div className={styles.priceFields}>
          <label>
            Текущая цена
            <input
              value={`${service.price.toLocaleString("ru-RU")} ₽`}
              readOnly
            />
          </label>
          <label>
            Новая цена
            <input
              type="number"
              min={0}
              max={10000000}
              step={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-invalid={submitted && invalidPrice}
            />
            {submitted && invalidPrice && (
              <span role="alert">Введите целую цену от 0 до 10 000 000 ₽.</span>
            )}
          </label>
          <label>
            Старая цена
            <input
              type="number"
              min={0}
              max={10000000}
              step={1}
              value={oldPrice}
              onChange={(event) => setOldPrice(event.target.value)}
              aria-invalid={submitted && isMoneyInvalid(details.oldPrice)}
            />
          </label>
          <label>
            Скидка, %
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
              aria-invalid={submitted && invalidDiscount}
            />
            {submitted && invalidDiscount && (
              <span role="alert">Введите скидку от 0 до 100%.</span>
            )}
          </label>
          <label>
            Минимальная цена
            <input
              type="number"
              min={0}
              max={10000000}
              step={1}
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              aria-invalid={submitted && isMoneyInvalid(details.minPrice)}
            />
          </label>
          <label>
            Максимальная цена
            <input
              type="number"
              min={0}
              max={10000000}
              step={1}
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              aria-invalid={submitted && isMoneyInvalid(details.maxPrice)}
            />
          </label>
        </div>
        {submitted && invalidDetails && (
          <p role="alert" className={styles.optionError}>
            Дополнительные цены должны быть целыми числами от 0 до 10 000 000 ₽.
          </p>
        )}
        <OptionsEditor
          options={options}
          onChange={setOptions}
          invalid={submitted && !parsedOptions}
          compact
        />
        <div className={styles.priceDialogActions}>
          <Button variant="secondary" onClick={addOption}>
            + Добавить параметр
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit">Сохранить цену</Button>
        </div>
      </form>
    </AdminDialog>
  );
}
