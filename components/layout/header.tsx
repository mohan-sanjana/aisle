import Link from "next/link";

// Display labels are visitor-friendly; URLs stay stable so internal links
// across the curriculum and content don't have to change.
const navItems = [
  { href: "/knowledge", label: "Learn" },
  { href: "/components", label: "Explore" },
  { href: "/sizer", label: "Plan" },
  { href: "/designer", label: "Design" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link
          href="/"
          aria-label="Aisle home"
          className="text-h3 leading-none tracking-tight text-slate-900"
        >
          {/* Wordmark: lowercase "aisle" with weight emphasis on "ai" */}
          <span className="font-bold">ai</span>
          <span className="font-medium">sle</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-1 text-small">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
