import { CurriculumNav } from "./_components/curriculum-nav";

/**
 * Knowledge section layout. Persistent left sidebar at `md:` (768px) and
 * above, two-column uniform-chip grid below that. The active-module
 * highlight is handled inside <CurriculumNav /> (client component, uses
 * usePathname); the surrounding layout stays server-rendered.
 */
export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto flex flex-col gap-8 px-4 py-10 md:flex-row md:gap-10">
      <aside className="shrink-0 md:w-60 lg:w-64">
        <CurriculumNav />
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
