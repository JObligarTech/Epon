/**
 * Sample connections are tagged in their Plaid item id rather than by a column
 * of their own. It needs no migration, it cannot be forgotten when a row is
 * copied, and a real Plaid item id will never collide with it.
 */
export const SAMPLE_PREFIX = "sample:";

export function isSampleItemId(plaidItemId: string): boolean {
  return plaidItemId.startsWith(SAMPLE_PREFIX);
}

export function sampleItemId(institutionId: string): string {
  return `${SAMPLE_PREFIX}${institutionId}`;
}
