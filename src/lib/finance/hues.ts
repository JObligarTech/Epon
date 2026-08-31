import type { InstitutionHue } from "./types";

/**
 * The institution palette, in the order slots are handed out. The order is the
 * validated one — adjacent slots are the pairs that were checked for colour
 * vision separation, so handing them out in sequence keeps the first few
 * connections maximally distinct.
 */
export const INSTITUTION_HUES: readonly InstitutionHue[] = [
  "marine",
  "mulberry",
  "bronze",
  "pine",
  "violet",
  "teal",
];

export function hueForIndex(index: number): InstitutionHue {
  // Beyond six, wrap. Two institutions then share a hue, which the grouped
  // legend still disambiguates by name.
  return INSTITUTION_HUES[((index % INSTITUTION_HUES.length) + INSTITUTION_HUES.length) %
    INSTITUTION_HUES.length];
}

/**
 * The slot a new connection should take: the lowest one this user is not
 * already using.
 *
 * Deriving it by hashing the institution id instead would look tidier and
 * collide constantly — six slots and four banks collide about seventy percent
 * of the time. Assigning at connect time and storing it also means an existing
 * institution never changes colour because a new one appeared, and removing a
 * connection does not repaint the others.
 */
export function nextHueIndex(usedIndexes: readonly number[]): number {
  const used = new Set(usedIndexes);
  for (let index = 0; index < INSTITUTION_HUES.length; index += 1) {
    if (!used.has(index)) return index;
  }
  // All six taken: reuse the least recently taken slot.
  return usedIndexes.length % INSTITUTION_HUES.length;
}
