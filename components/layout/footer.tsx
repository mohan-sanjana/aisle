export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container mx-auto flex flex-col items-start justify-between gap-2 px-4 py-6 text-small text-slate-500 sm:flex-row sm:items-center">
        <p>
          Aisle is an open-source project by{" "}
          <span className="text-slate-700">Sanjana Mohan</span>.
        </p>
        <p className="flex items-center gap-4">
          <a
            href="https://github.com/mohan-sanjana/aisle"
            className="text-slate-600 hover:text-brand-700"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub
          </a>
          <span aria-hidden="true">·</span>
          <span>&copy; {year}</span>
        </p>
      </div>
    </footer>
  );
}
