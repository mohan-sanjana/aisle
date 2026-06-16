"use client";

import { Download, Link2, Printer, Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { SizerInput, SizerOutput } from "@/lib/sizer/types";

import {
  downloadMarkdown,
  sizerOutputToMarkdown,
} from "../_lib/export-markdown";

export function ExportButtons({
  input,
  output,
}: {
  input: SizerInput;
  output: SizerOutput;
}) {
  const [copied, setCopied] = React.useState(false);

  function handleDownload() {
    const md = sizerOutputToMarkdown(input, output);
    const name = `aisle-sizer-${new Date().toISOString().slice(0, 10)}.md`;
    downloadMarkdown(name, md);
  }

  async function handleCopyUrl() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — no-op
    }
  }

  function handlePrint() {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        aria-label="Download plan as markdown"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Markdown
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyUrl}
        aria-label="Copy shareable URL"
      >
        {copied ? (
          <Check className="h-4 w-4 text-brand-700" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "Copied" : "Share URL"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        aria-label="Print plan"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        Print
      </Button>
    </div>
  );
}
