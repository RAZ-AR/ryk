import Link from "next/link";
import { SvcLabel } from "@/components/SvcLabel";
import styles from "./page.module.css";

/** Заглушка до реализации онбординга (Фаза 4 плана разработки). */
export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.logo}>RYK</div>
      <SvcLabel tone="pink" className={styles.promise}>
        Одна настоящая история каждую неделю
      </SvcLabel>

      <h1 className={styles.lead}>Жизнь не должна ждать свободного времени.</h1>

      <p className={styles.note}>
        Каркас поднят, дизайн-система на месте. Экраны появятся по плану разработки — начиная с
        онбординга. Пока можно посмотреть <Link href="/design">витрину примитивов</Link>.
      </p>
    </main>
  );
}
