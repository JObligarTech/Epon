/**
 * Kept out of actions.ts because a "use server" file may only export async
 * functions — a constant or a type there fails the build, and the error points
 * at the last line of the file rather than the export causing it.
 */
export type AuthState = { error: string | null; notice: string | null };

export const EMPTY_STATE: AuthState = { error: null, notice: null };
