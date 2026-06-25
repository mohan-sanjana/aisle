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
  title: string;
  summary: string;
  learning_objective: string;
  prerequisites: string[];
};

export const MODULES: ReadonlyArray<ModuleMeta> = [
  {
    slug: "what-is-inference",
    index: 1,
    title: "What is AI inference?",
    summary:
      "Inference vs training, where it sits in the AI workload landscape, and why it's the workload most enterprises will run on-prem first.",
    learning_objective:
      "Distinguish AI inference from training and the other major AI workload categories, and recognize why running an inference workload is not like running any traditional application.",
    prerequisites: [],
  },
  {
    slug: "playbook-breaks",
    index: 2,
    title: "Why your existing playbook breaks",
    summary:
      "Four assumptions about capacity planning that don't survive contact with an inference workload.",
    learning_objective:
      "Name the four assumptions in traditional infrastructure planning that AI inference violates, and articulate the new reality each one is replaced by.",
    prerequisites: ["what-is-inference"],
  },
  {
    slug: "how-a-model-serves",
    index: 3,
    title: "How a model actually serves a request",
    summary:
      "Inside the request lifecycle: model weights in memory, prefill, decode, and why the bottleneck is data movement, not compute.",
    learning_objective:
      "Walk through what happens when an inference request lands on a GPU, distinguish prefill from decode, and explain why memory bandwidth dominates decode latency.",
    prerequisites: ["playbook-breaks"],
  },
  {
    slug: "kv-cache",
    index: 4,
    title: "The KV cache, the silent capacity killer",
    summary:
      "Why each in-flight conversation needs its own working memory, and why context length and concurrency multiply.",
    learning_objective:
      "Define the KV cache, calculate why it dominates memory in long-context workloads, and predict how changing context length or concurrency moves the capacity budget.",
    prerequisites: ["how-a-model-serves"],
  },
  {
    slug: "seven-parameters",
    index: 5,
    title: "The seven parameters that drive sizing",
    summary:
      "The full input set: model size, precision, context, concurrent users, RPS, latency SLOs, burst factor.",
    learning_objective:
      "Identify the seven inputs that drive every sizing decision and explain what each one changes in the recommended infrastructure.",
    prerequisites: ["kv-cache"],
  },
  {
    slug: "worked-example",
    index: 6,
    title: "A worked example, end-to-end",
    summary:
      "A regional bank's RAG chatbot: walk through inputs, the math, and the resulting infrastructure recommendation.",
    learning_objective:
      "Connect every input parameter to a concrete output in a realistic enterprise sizing case, and develop intuition for which inputs move the answer most.",
    prerequisites: ["seven-parameters"],
  },
  {
    slug: "it-ai-conversation",
    index: 7,
    title: "The IT-and-AI planning conversation",
    summary:
      "A one-page checklist: who owns which decision, what to ask the AI team, and what red flags to watch for.",
    learning_objective:
      "Run a productive planning conversation with an AI team, with explicit ownership of each decision and a short list of pitfalls to surface early.",
    prerequisites: ["worked-example"],
  },
  {
    slug: "optimization-techniques",
    index: 8,
    title: "Optimization techniques",
    summary:
      "The AI team's six big levers. Quantization, batching, caching, LoRA, speculative decoding. What each does, how much it changes the math, when to use it.",
    learning_objective:
      "Identify the six major LLM inference optimization techniques, understand the throughput and memory impact of each, and know when each one is worth adopting in a deployment.",
    prerequisites: ["it-ai-conversation"],
  },
];

export function getModule(slug: string): ModuleMeta | undefined {
  return MODULES.find((m) => m.slug === slug);
}

/** Path to the MDX file for a given module, relative to project root. */
export function moduleFilename(m: ModuleMeta): string {
  return `content/knowledge/modules/m${m.index}-${m.slug}.mdx`;
}
