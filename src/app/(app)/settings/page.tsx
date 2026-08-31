import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { Button } from "@/components/ui";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth";
import styles from "./settings.module.css";

export const metadata: Metadata = { title: "Settings — E-PON" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const authEnabled = isAuthEnabled();

  return (
    <div className={styles.page}>
      <section className={styles.section} aria-labelledby="profile-heading">
        <div className={styles.head}>
          <h2 id="profile-heading" className={styles.title}>
            Profile
          </h2>
        </div>
        <div className={styles.body}>
          {user ? (
            <>
              <div className={styles.row}>
                <span className={styles.label}>Name</span>
                <span className={styles.value}>
                  {(user.user_metadata?.full_name as string | undefined) ?? "Not set"}
                </span>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{user.email}</span>
              </div>
            </>
          ) : (
            <p className={styles.note}>
              {authEnabled
                ? "You are not signed in."
                : "Accounts arrive once Supabase is connected. Until then E-PON runs on sample data so the product can be used and reviewed."}
            </p>
          )}
        </div>
      </section>

      <AppearanceSection />

      <section className={styles.section} aria-labelledby="rest-heading">
        <div className={styles.head}>
          <h2 id="rest-heading" className={styles.title}>
            Everything else
          </h2>
        </div>
        <div className={styles.body}>
          <p className={styles.note}>
            Security, connected institutions and synchronisation settings arrive with the Plaid
            integration.
          </p>
        </div>
      </section>

      {user ? (
        <form action={signOut} className={styles.signOut}>
          <Button type="submit" variant="quiet">
            Sign out
          </Button>
        </form>
      ) : null}
    </div>
  );
}
