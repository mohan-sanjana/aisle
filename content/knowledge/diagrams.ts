/**
 * Registry of Mermaid diagram sources used in Knowledge modules.
 *
 * Why this exists: next-mdx-remote v6 (RSC) intermittently drops or mangles
 * template-literal-typed JSX attribute values, and the children pattern
 * doesn't always round-trip cleanly either. To avoid the whole class of bug,
 * MDX authors pass a short identifier (`name="request-lifecycle"`) and the
 * component looks up the actual source here at render time.
 *
 * Adding a new diagram: add an entry to the object below, then reference it
 * from MDX as `<KnowledgeMermaid name="your-key" caption="..." />`.
 */
export const DIAGRAMS = {
  "request-lifecycle": `sequenceDiagram
    autonumber
    participant U as User
    participant API as API Gateway
    participant Srv as Inference Server
    participant GPU as GPU(s)

    U->>API: POST /chat with prompt
    API->>Srv: validated request
    Srv->>GPU: prompt tokens
    Note over GPU: PREFILL: read all tokens in parallel, build KV cache
    GPU-->>Srv: first output token
    Srv-->>U: stream first token (TTFT)

    loop For each remaining output token
      Note over GPU: DECODE: read weights + KV cache from memory, generate next token
      GPU->>Srv: next token
      Srv->>U: stream token (TPOT)
    end`,

  "vram-budget-70b": `pie
    title VRAM budget: 70B FP8, 64 in-flight requests at 6K avg context
    "Model weights (fixed)" : 70
    "KV cache (64 requests x 1 GB)" : 64
    "Activations" : 10
    "Headroom (25%)" : 36`,
} as const;

export type DiagramName = keyof typeof DIAGRAMS;
