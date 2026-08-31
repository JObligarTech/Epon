import { Skeleton } from "@/components/ui";
import styles from "./Skeletons.module.css";

/**
 * Announced once, politely, rather than every bone being described. A screen
 * reader should hear "Loading your overview", not a list of forty grey boxes.
 */
function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="srOnly">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <Loading label="Loading your overview">
      <div className={styles.hero}>
        <Skeleton width={92} height={11} />
        <div style={{ marginTop: 14 }}>
          <Skeleton width="min(420px, 70%)" height={56} radius={10} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Skeleton width={148} height={22} radius={99} />
        </div>
        <div className={styles.bars}>
          <Skeleton width="46%" height={15} radius={4} />
          <Skeleton width="28%" height={15} radius={4} />
          <Skeleton width="14%" height={15} radius={4} />
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.stack}>
          <div className={styles.panel}>
            <Skeleton width={124} height={13} />
            <div className={styles.rows}>
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className={styles.row}>
                  <Skeleton width={9} height={9} radius={3} />
                  <Skeleton height={9} radius={99} />
                  <Skeleton width={62} height={11} />
                </div>
              ))}
            </div>
          </div>
          <div className={styles.panel}>
            <Skeleton width={110} height={13} />
            <TransactionRows count={5} />
          </div>
        </div>

        <div className={styles.stack}>
          <div className={styles.panel}>
            <Skeleton width={86} height={11} />
            <div style={{ marginTop: 12 }}>
              <Skeleton width={132} height={30} />
            </div>
          </div>
          <div className={styles.panel}>
            <Skeleton width={72} height={13} />
            <TransactionRows count={3} />
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function AccountsSkeleton() {
  return (
    <Loading label="Loading your accounts">
      <Skeleton width={168} height={11} />
      <div style={{ margin: "12px 0 26px" }}>
        <Skeleton width={240} height={38} radius={8} />
      </div>
      <div className={styles.panel}>
        {[0, 1, 2].map((folio) => (
          <div key={folio} style={{ marginBottom: folio === 2 ? 0 : 26 }}>
            <div className={styles.row}>
              <Skeleton width={34} height={34} radius={10} />
              <div className={styles.lines}>
                <Skeleton width={148} height={13} />
                <Skeleton width={196} height={10} />
              </div>
              <span />
            </div>
            <TransactionRows count={2} />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function TransactionsSkeleton() {
  return (
    <Loading label="Loading your transactions">
      <Skeleton width={124} height={11} />
      <div style={{ margin: "12px 0 22px" }}>
        <Skeleton width={280} height={26} radius={8} />
      </div>
      <div className={styles.panel}>
        <div className={styles.filters}>
          <Skeleton width="34%" height={34} radius={10} />
          <Skeleton width={168} height={34} radius={10} />
          <Skeleton width={132} height={34} radius={10} />
          <Skeleton width={132} height={34} radius={10} />
        </div>
        <TransactionRows count={8} />
      </div>
    </Loading>
  );
}

function TransactionRows({ count }: { count: number }) {
  return (
    <div className={styles.rows}>
      {Array.from({ length: count }, (_, row) => (
        <div key={row} className={styles.row}>
          <Skeleton width={36} height={36} radius={11} />
          <div className={styles.lines}>
            <Skeleton width={`${52 + ((row * 13) % 34)}%`} height={12} />
            <Skeleton width={`${34 + ((row * 7) % 22)}%`} height={10} />
          </div>
          <Skeleton width={68} height={12} />
        </div>
      ))}
    </div>
  );
}
