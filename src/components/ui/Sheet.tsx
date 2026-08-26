"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import styles from "./Sheet.module.css";

/**
 * A side drawer on desktop, a bottom sheet on phones — one component, because
 * it is the same thing at two sizes.
 *
 * Focus is moved in on open and restored on close, Escape dismisses, and the
 * page behind is marked inert so neither the keyboard nor a screen reader can
 * wander out of an open sheet.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    // Scrolling the page under an open sheet reads as the sheet being broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, onClose]);

  return (
    <>
      <div
        className={[styles.scrim, open ? styles.scrimOpen : ""].filter(Boolean).join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[styles.sheet, open ? styles.sheetOpen : ""].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // A closed sheet stays mounted so it can animate out, which means its
        // close button and links are still in the DOM. inert takes them out of
        // both the tab order and the accessibility tree; aria-hidden alone left
        // focusable content reachable by keyboard while hidden from screen
        // readers, which axe flags as aria-hidden-focus.
        inert={open ? undefined : true}
        aria-hidden={open ? undefined : true}
        tabIndex={-1}
        ref={panelRef}
      >
        <span className={styles.grab} aria-hidden="true" />
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label={`Close ${title}`}>
            <Icon name="close" size={15} strokeWidth={1.8} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </>
  );
}
