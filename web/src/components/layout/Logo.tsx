export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M9 11h14M9 16h9M9 21h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22.5" cy="16" r="2.5" fill="#fff" />
    </svg>
  );
}
