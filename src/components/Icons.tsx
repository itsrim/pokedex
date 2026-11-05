const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const IconBinder = () => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 3v18M11 8h6M11 12h6" />
  </svg>
)
export const IconScan = () => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    <rect x="8.5" y="7" width="7" height="10" rx="1" />
  </svg>
)
export const IconPlus = () => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)
export const IconClose = () => (
  <svg viewBox="0 0 24 24" {...p} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const IconMore = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
)
