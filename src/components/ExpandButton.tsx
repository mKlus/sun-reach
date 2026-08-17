type ExpandButtonProps = {
  onClick: () => void
  className?: string
}

export function ExpandButton({ onClick, className }: ExpandButtonProps) {
  return (
    <button type="button" className={className} title="Larger" aria-label="Larger" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
        />
      </svg>
    </button>
  )
}
