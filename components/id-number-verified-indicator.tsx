/**
 * Shown on marketplace cards and public talent headings when `id_validation_status === 'verified'`.
 * Copy must say "ID number verified" (not identity verified).
 */
export function IdNumberVerifiedIndicator({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 ${className ?? ""}`}
      title="ID number verified"
    >
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.114-.958l-3.804 4.23-1.677-1.678a.75.75 0 10-1.06 1.061l2.25 2.25a.75.75 0 001.114-.002l4.291-4.771z"
          clipRule="evenodd"
        />
      </svg>
      ID number verified
    </span>
  );
}
