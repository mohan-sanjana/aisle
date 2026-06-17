import { ReadingTime } from "./reading-time";

export function ModuleHeader({
  index,
  title,
  learningObjective,
  readingTimeMinutes,
}: {
  index: number;
  title: string;
  learningObjective: string;
  readingTimeMinutes: number;
}) {
  return (
    <header className="mb-8 border-b border-slate-200 pb-6">
      <div className="flex items-center gap-3 text-sm font-medium text-brand-700">
        <span className="font-mono">Module {index}</span>
        <ReadingTime minutes={readingTimeMinutes} />
      </div>
      <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-4 max-w-prose rounded-md border-l-4 border-brand-200 bg-brand-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-brand-800">What you&rsquo;ll learn: </span>
        {learningObjective}
      </p>
    </header>
  );
}
