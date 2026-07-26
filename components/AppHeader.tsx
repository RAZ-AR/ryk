import Image from "next/image";
import styles from "./AppHeader.module.css";

/** Логотип на всех экранах приложения. Тап — возврат на главный экран. */
export function AppHeader({ label, onHome }: { label: string; onHome: () => void }) {
  return (
    <button type="button" className={styles.home} onClick={onHome} aria-label={label}>
      <Image
        src="/ryk-logo-pink.svg"
        alt=""
        width={406}
        height={271}
        unoptimized
        className={styles.mark}
      />
    </button>
  );
}
