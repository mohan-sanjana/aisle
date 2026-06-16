import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SizerAssumptions } from "@/lib/sizer/types";

function isUrl(s: string): boolean {
  return /^https?:\/\//.test(s);
}

export function AssumptionsPanel({
  assumptions,
}: {
  assumptions: SizerAssumptions;
}) {
  const t = assumptions.throughput_tokens_per_sec_per_replica;
  return (
    <Accordion type="single" collapsible className="rounded-md border border-slate-200 bg-white">
      <AccordionItem value="assumptions" className="border-b-0">
        <AccordionTrigger className="px-4 hover:no-underline">
          Show calc assumptions
        </AccordionTrigger>
        <AccordionContent className="px-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Throughput
              </dt>
              <dd className="font-mono text-small text-slate-900">
                {t.toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
                tokens/sec/replica
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Source
              </dt>
              <dd className="text-small text-slate-700 break-words">
                {isUrl(assumptions.throughput_source) ? (
                  <a
                    href={assumptions.throughput_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 underline-offset-4 hover:underline"
                  >
                    {assumptions.throughput_source}
                  </a>
                ) : (
                  assumptions.throughput_source
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Layers
              </dt>
              <dd className="font-mono text-small text-slate-900">
                {assumptions.layers}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                KV heads
              </dt>
              <dd className="font-mono text-small text-slate-900">
                {assumptions.kv_heads}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Head dim
              </dt>
              <dd className="font-mono text-small text-slate-900">
                {assumptions.head_dim}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Bytes / param
              </dt>
              <dd className="font-mono text-small text-slate-900">
                {assumptions.bytes_per_param}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                Bytes / KV element
              </dt>
              <dd className="font-mono text-small text-slate-900">
                {assumptions.bytes_per_kv_element}
              </dd>
            </div>
          </dl>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
