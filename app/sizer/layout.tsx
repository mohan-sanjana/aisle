import Link from "next/link";
import { ChevronRight } from "lucide-react";

import "./sizer.css";

export default function SizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <nav
        aria-label="Breadcrumb"
        className="no-print mb-4 flex items-center gap-1 text-small text-slate-500"
      >
        <Link
          href="/"
          className="rounded px-1 py-0.5 hover:bg-brand-50 hover:text-brand-700"
        >
          Home
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-slate-900">Sizer</span>
      </nav>
      {children}
    </div>
  );
}
