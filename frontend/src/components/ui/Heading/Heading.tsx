import type { HTMLAttributes } from "react";
import styles from "./Heading.module.css";

interface HeadingProps extends HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
}

export function Heading({
  title,
  description,
  className = "",
  ...props
}: HeadingProps) {
  return (
    <section
      {...props}
      className={[styles.heading, className].filter(Boolean).join(" ")}
    >
      <h1 className={styles.title}>{title}</h1>

      {description && <p className={styles.description}>{description}</p>}
    </section>
  );
}
