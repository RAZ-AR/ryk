import styles from "./ProfileEntry.module.css";

/** Точка входа в личный кабинет — плавающая метка поверх любого экрана. */
export function ProfileEntry({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.entry} onClick={onClick} aria-label={label}>
      {label}
    </button>
  );
}
