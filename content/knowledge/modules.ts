/**
 * Module registry. Source-of-truth for module ordering, titles, slugs,
 * and learning objectives. The actual prose lives in
 * `./modules/m{index}-{slug}.mdx` and is rendered via next-mdx-remote
 * by `app/knowledge/[slug]/page.tsx`.
 *
 * Reading time is *not* in this metadata anymore. It is computed at build
 * time from the MDX word count via `estimateReadingTime` in
 * `./reading-time.ts`. That way it updates automatically when content
 * changes or a new module is added.
 */

export type ModuleMeta = {
  slug: string;
  index: number;
  /** Which Part of the curriculum this module belongs to (1 through 6). */
  part: number;
  title: string;
  summary: string;
  learning_objective: string;
  prerequisites: string[];
};

/** Part titles for the sidebar group headers. */
export const PART_NAMES: Record<number, string> = {
  1: "Foundations",
  2: "GPU architecture and memory",
  3: "Planning your workload",
  4: "A single inference server",
  5: "Scaling out",
  6: "Production",
};

/** Convert a part number to a Roman numeral label for display. */
export function partLabel(part: number): string {
  const numerals = ["", "I", "II", "III", "IV", "V", "VI"];
  return `Part ${numerals[part] ?? part}`;
}

export const MODULES: ReadonlyArray<ModuleMeta> = [
  {
    slug: "what-is-inference",
    index: 1,
    part: 1,
    title: "What is AI inference?",
    summary:
      "Inference vs training, where it sits in the AI workload landscape, and why it's the workload most enterprises will run on-prem first.",
    learning_objective:
      "Distinguish AI inference from training and the other major AI workload categories, and recognize why running an inference workload is not like running any traditional application.",
    prerequisites: [],
  },
  {
    slug: "tokens-and-context-windows",
    index: 2,
    part: 1,
    title: "Tokens and context windows",
    summary:
      "The unit of text the model reads and writes, and the maximum amount of it the model can hold in mind at once. Every other number in inference is built on these two.",
    learning_objective:
      "Define what a token is, understand the rough rule of thumb for token-to-character conversion, and explain what a context window controls in production.",
    prerequisites: ["what-is-inference"],
  },
  {
    slug: "how-a-model-serves",
    index: 3,
    part: 1,
    title: "How a model makes a token",
    summary:
      "The two-phase mechanism that produces each token: prefill (parallel, compute-bound) and decode (sequential, memory-bound), and the TTFT and TPOT timings each phase sets.",
    learning_objective:
      "Distinguish prefill from decode, name the timings each phase produces (TTFT and TPOT), and explain why decode is memory-bound while prefill is compute-bound.",
    prerequisites: ["tokens-and-context-windows"],
  },
  {
    slug: "inside-a-gpu",
    index: 4,
    part: 2,
    title: "Inside a GPU",
    summary:
      "What a GPU actually is, why HBM holds the model, and why memory bandwidth, not compute, sets the floor on decode latency.",
    learning_objective:
      "Name the three things HBM holds, explain why memory bandwidth sets the TPOT floor, and compare the major GPU SKUs by capacity and bandwidth.",
    prerequisites: ["how-a-model-serves"],
  },
  {
    slug: "kv-cache",
    index: 5,
    part: 2,
    title: "The KV cache, the silent capacity killer",
    summary:
      "Why each in-flight conversation needs its own working memory, and why context length and concurrency multiply.",
    learning_objective:
      "Define the KV cache, calculate why it dominates memory in long-context workloads, and predict how changing context length or concurrency moves the capacity budget.",
    prerequisites: ["inside-a-gpu"],
  },
  {
    slug: "managing-kv-pressure",
    index: 6,
    part: 2,
    title: "Managing KV cache pressure",
    summary:
      "Three architectural levers (KV cache quantization, MLA, strict context caps) that reduce KV pressure without buying more GPUs.",
    learning_objective:
      "Name the three levers that reduce KV cache pressure, understand the trade each one makes, and know which owner pulls which lever.",
    prerequisites: ["kv-cache"],
  },
  {
    slug: "playbook-breaks",
    index: 7,
    part: 2,
    title: "Why your existing playbook breaks",
    summary:
      "Four assumptions about capacity planning that don't survive contact with an inference workload.",
    learning_objective:
      "Name the four assumptions in traditional infrastructure planning that AI inference violates, and articulate the new reality each one is replaced by.",
    prerequisites: ["managing-kv-pressure"],
  },
  {
    slug: "seven-parameters",
    index: 8,
    part: 3,
    title: "The seven parameters that drive sizing",
    summary:
      "The full input set: model size, precision, context, concurrent users, RPS, latency SLOs, burst factor.",
    learning_objective:
      "Identify the seven inputs that drive every sizing decision and explain what each one changes in the recommended infrastructure.",
    prerequisites: ["playbook-breaks"],
  },
  {
    slug: "worked-example",
    index: 9,
    part: 3,
    title: "A worked example, end-to-end",
    summary:
      "A regional bank's RAG chatbot: walk through inputs, the math, and the resulting infrastructure recommendation.",
    learning_objective:
      "Connect every input parameter to a concrete output in a realistic enterprise sizing case, and develop intuition for which inputs move the answer most.",
    prerequisites: ["seven-parameters"],
  },
  {
    slug: "single-server",
    index: 10,
    part: 4,
    title: "What an inference server looks like",
    summary:
      "The complete picture of a single inference chassis: CPU, RAM, NVMe, NICs, NVLink, power draw, cooling tier, and the facility envelope it has to live in.",
    learning_objective:
      "Describe the physical and electrical shape of an inference server end to end, and know which specs are dictated by the AI workload versus the data center.",
    prerequisites: ["worked-example"],
  },
  {
    slug: "beyond-one-gpu",
    index: 11,
    part: 5,
    title: "Beyond one GPU",
    summary:
      "Tensor parallelism, pipeline parallelism, expert parallelism, replicas, routing, and the fabrics that hold a multi-GPU or multi-node deployment together.",
    learning_objective:
      "Explain when one GPU stops being enough, name the parallelism strategy each scaling threshold forces, and connect each strategy to the fabric it demands.",
    prerequisites: ["single-server"],
  },
  {
    slug: "inference-engines",
    index: 12,
    part: 6,
    title: "Inference engines",
    summary:
      "vLLM, TensorRT-LLM, SGLang, and Triton. What each one is, what they share, and how the engine choice changes the optimization math.",
    learning_objective:
      "Name the four major inference engines, identify what's built-in versus opt-in for each, and predict how the engine choice changes per-replica throughput.",
    prerequisites: ["beyond-one-gpu"],
  },
  {
    slug: "optimization-techniques",
    index: 13,
    part: 6,
    title: "Optimization techniques",
    summary:
      "The AI team's six big levers. Quantization, batching, caching, LoRA, speculative decoding. What each does, how much it changes the math, when to use it.",
    learning_objective:
      "Identify the six major LLM inference optimization techniques, understand the throughput and memory impact of each, and know when each one is worth adopting in a deployment.",
    prerequisites: ["inference-engines"],
  },
  {
    slug: "it-ai-conversation",
    index: 14,
    part: 6,
    title: "The IT-and-AI planning conversation",
    summary:
      "The curriculum closer. A one-page checklist with role ownership, questions to ask the AI team, red flags to watch for, and the artifacts a successful kickoff produces.",
    learning_objective:
      "Run a productive planning conversation with an AI team, with explicit ownership of each decision and a short list of pitfalls to surface early.",
    prerequisites: ["optimization-techniques"],
  },
];

export function getModule(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug);
}

/** Path to the MDX file for a given module, relative to project root.
 *
 *  Filename is the slug only. Reordering or inserting a module no longer
 *  requires renaming the file, which keeps git history clean and lets us
 *  reshape the curriculum without churn. */
export function moduleFilename(m: ModuleMeta): string {
  return `content/knowledge/modules/${m.slug}.mdx`;
}
