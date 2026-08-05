export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono-label text-[11px] text-[var(--ink-faint)]">
          © {new Date().getFullYear()} Sargundeep Singh
        </p>
        <p className="font-mono-label text-[11px] text-[var(--ink-faint)]">
          press <kbd className="rounded border border-[var(--line)] px-1">`</kbd> for a hidden console
        </p>
      </div>
    </footer>
  );
}
