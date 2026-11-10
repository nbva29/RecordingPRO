import styles from "./CategoryCard.module.css";

interface CategoryCardProps {
  title: string;
  onClick: () => void;
}

export function CategoryCard({ title, onClick }: CategoryCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <span className={styles.title}>{title}</span>
    </button>
  );
}
