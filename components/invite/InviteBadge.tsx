import styles from "./InviteBadge.module.css";

/**
 * Значок непрочитанных приглашений. Рендерится только когда они есть —
 * пустой значок был бы шумом, а не сигналом.
 */
export function InviteBadge({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick: () => void;
}) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      className={styles.badge}
      onClick={onClick}
      aria-label={`${label}: ${count}`}
    >
      <span className={styles.count}>{count}</span>
      <span>{label}</span>
    </button>
  );
}
