/**
 * One 16x16 grid, stroked with currentColor, so every icon shares weight and
 * optical size. Paths are ported from the design prototype.
 */
const PATHS = {
  home: <path d="M2.6 7.4 8 3l5.4 4.4V13a.9.9 0 0 1-.9.9h-3.1v-3.6H6.6v3.6H3.5a.9.9 0 0 1-.9-.9Z" />,
  accounts: (
    <>
      <rect x="2.2" y="4" width="11.6" height="8.4" rx="1.6" />
      <path d="M2.2 6.9h11.6" />
    </>
  ),
  transactions: (
    <>
      <path d="M2.6 5.2h8.1M8.6 2.9 11 5.2 8.6 7.5" />
      <path d="M13.4 10.8H5.3M7.4 8.5 5 10.8l2.4 2.3" />
    </>
  ),
  budgeting: (
    <>
      <path d="M8 2.4v5.7l4.4 3.2" />
      <circle cx="8" cy="8" r="5.7" />
    </>
  ),
  goals: (
    <>
      <circle cx="8" cy="8" r="5.7" />
      <circle cx="8" cy="8" r="2.4" />
    </>
  ),
  debt: (
    <>
      <path d="M2.6 11.4 6 7.9l2.4 2.2 4.9-5.5" />
      <path d="M13.3 7.9V4.6H10" />
    </>
  ),
  recurring: (
    <>
      <path d="M3 8a5 5 0 0 1 8.5-3.5M13 8a5 5 0 0 1-8.5 3.5" />
      <path d="M11.6 1.8v2.9H8.7M4.4 14.2v-2.9h2.9" />
    </>
  ),
  insights: <path d="M3 12.6V8M6.6 12.6V4.3M10.2 12.6V9.6M13.8 12.6V6" />,
  settings: (
    <>
      <circle cx="8" cy="8" r="2.1" />
      <path d="M8 1.9v1.6M8 12.5v1.6M14.1 8h-1.6M3.5 8H1.9M12.3 3.7l-1.1 1.1M4.8 11.2l-1.1 1.1M12.3 12.3l-1.1-1.1M4.8 4.8 3.7 3.7" />
    </>
  ),
  more: (
    <>
      <circle cx="3.4" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.6" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  plus: <path d="M8 3.2v9.6M3.2 8h9.6" />,
  warn: (
    <>
      <path d="M8 5.6v3.4M8 11.3v.1" />
      <path d="M6.9 2.7 1.9 11.4a1.3 1.3 0 0 0 1.1 1.9h10a1.3 1.3 0 0 0 1.1-1.9L9.1 2.7a1.3 1.3 0 0 0-2.2 0Z" />
    </>
  ),
  arrowUp: <path d="M8 13V3.6M4.4 7.1 8 3.5l3.6 3.6" />,
  arrowDown: <path d="M8 3v9.4M4.4 8.9 8 12.5l3.6-3.6" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  chevron: <path d="M6 3.5 10.5 8 6 12.5" />,
  chevronDown: <path d="M4 6.2 8 10.2l4-4" />,
  search: (
    <>
      <circle cx="7.2" cy="7.2" r="4.1" />
      <path d="M10.3 10.3 13.4 13.4" />
    </>
  ),
  check: <path d="M3.4 8.3 6.4 11l6.2-6.4" />,
  spark: <path d="M8 1.9 9.4 6l4.1 1.4L9.4 8.9 8 13l-1.4-4.1L2.5 7.4 6.6 6Z" />,
  bank: (
    <>
      <path d="M2.4 6.4 8 2.9l5.6 3.5" />
      <path d="M3.9 6.9v5.2M6.6 6.9v5.2M9.4 6.9v5.2M12.1 6.9v5.2M2.2 13.2h11.6" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
