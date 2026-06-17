import { Clock } from "lucide-react";

export function ReadingTime({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      <Clock aria-hidden="true" className="h-3 w-3" />
      {minutes} min read
    </span>
  );
}
