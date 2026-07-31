import type { LifeCategory } from "@/generated/prisma/enums";
import { ExperienceVisual } from "@/components/ExperiencePattern";
import { HandNote } from "@/components/HandNote";
import { SvcLabel } from "@/components/SvcLabel";
import { PhotoButton } from "./PhotoButton";
import styles from "./FilmFrame.module.css";

/*
 * Кадр проявленной плёнки — одно воспоминание.
 *
 * Почему плёнка, а не сетка превью: сетка превращает прожитое в коллекцию,
 * которую хочется пополнять, — а это счёт и давление. Плёнка читается
 * сверху вниз, по одному кадру, и заканчивается там, где закончилась:
 * пустое место в конце ничего не требует.
 *
 * Перенесённая неделя получает свой кадр наравне с прожитой, только тише:
 * «незавершённые желания без чувства вины» (PRD 5.9).
 */

type Props = {
  /** Стабильный ключ для узора, когда своего фото нет. */
  id: string;
  /** Дата как «26.07». */
  date: string;
  title: string;
  note: string | null;
  /** Кто рядом или что почувствовал — одна строка. */
  footnote: string;
  category: LifeCategory | null;
  photo: string | null;
  deferred: boolean;
  /** Настроено ли хранилище — без него кнопки загрузки нет. */
  canAttachPhoto: boolean;
};

export function FilmFrame({
  id,
  date,
  title,
  note,
  footnote,
  category,
  photo,
  deferred,
  canAttachPhoto,
}: Props) {
  return (
    <article className={[styles.frame, deferred && styles.quiet].filter(Boolean).join(" ")}>
      <span className={styles.holes} aria-hidden="true" />

      <div className={styles.body}>
        <div className={styles.window}>
          {/* У перенесённой недели картинки быть не может — её не было. */}
          {deferred ? (
            <span className={styles.blank} aria-hidden="true" />
          ) : (
            <ExperienceVisual id={id} category={category ?? "DISCOVERY"} imageUrl={photo} />
          )}
        </div>

        <div className={styles.caption}>
          <div className={styles.head}>
            <SvcLabel tone="faint">{date}</SvcLabel>
            <SvcLabel tone="faint">{footnote}</SvcLabel>
          </div>
          <h3 className={styles.title}>{title}</h3>
          {note ? (
            <div className={styles.note}>
              <HandNote>«{note}»</HandNote>
            </div>
          ) : null}

          {/* У перенесённой недели фото быть не может — её не было. */}
          {!deferred && (
            <PhotoButton memoryId={id} hasPhoto={photo != null} enabled={canAttachPhoto} />
          )}
        </div>
      </div>

      <span className={styles.holes} aria-hidden="true" />
    </article>
  );
}
