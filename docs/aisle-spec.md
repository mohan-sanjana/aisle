# Aisle — Phase 1 Spec (v1.0)

> **Aisle** — *AI Sizing and Learning Environment.* A web application that helps IT admins plan on-premises infrastructure for AI inference workloads. Educates, sizes, and recommends deployment architectures.

**Status:** Phase 1 spec, locked for build
**Author:** Sanjana Mohan (open-source project, MIT-licensed)
**Domain:** `sanjana-mohan.com/aisle`
**Repository:** `github.com/mohan-sanjana/aisle`
**Last updated:** 2026-06-15
**Companion files:**
- `sizing-math.md` — Sizer calculation engine specification
- `knowledge-outline.md` — Content outlines for the four Knowledge pages
- `catalog.json` — Canonical data file (accelerators, networking, storage, power/cooling, optimizations, serving engines)
- `catalog-sources.md` — Citation index for every spec in `catalog.json`

---

## 1. Overview and vision

IT admins are being asked to stand up infrastructure for AI workloads they have never seen before. The traditional planning rhythm — CPU cores, RAM, IOPS, network throughput, capacity-per-user — breaks down for LLM inference. A workload that "only has 200 users" can demand more burst memory than a production database. A 70 billion-parameter model can need one GPU at one precision and eight at another. A single user holding a 128,000-token context can consume 40 GB of HBM by themselves.

**Aisle** is a focused web application that gives IT admins the mental model, the parameters, and the math to plan on-premises LLM inference infrastructure with confidence. It is not a procurement tool. It is not a benchmarking site. It is not vendor-locked. It is an opinionated educational and planning workbench that turns a fluid, jargon-heavy problem space into a guided, defensible plan.

The product has four surfaces, each serving a different stage of the user's journey:

1. **Knowledge** — *learn* the foundations.
2. **Infrastructure Components** — *see* what the stack looks like in concrete example workloads.
3. **Sizer** — *quantify* what their own workload requires.
4. **Architecture Designer** — *visualize* the deployment architecture they should build.

The "aisle" metaphor is the rack aisle that runs between rows of servers — where infrastructure planners literally walk to think about what they're building.

## 2. Goals and non-goals

**Goals (Phase 1):**

- Educate IT admins enough to plan on-prem LLM inference infrastructure without becoming ML engineers.
- Produce a server-spec level sizing recommendation (CPU class, RAM, GPU SKU + count, NIC, local NVMe, replica count, fabric type, power and cooling envelope) that an admin can take into a procurement conversation.
- Output three scenarios per sizing run: baseline, burst, resilient (N+1 or N+2 redundancy).
- Provide canonical, sourced data on common hardware (NVIDIA H100/H200/B100/B200/GB200/L40S/L4/A100, AMD MI300X/MI325X) and common serving engines (vLLM, TensorRT-LLM, Triton, TGI, SGLang, Dynamo).
- Make the planning conversation between IT and AI teams more productive — explicitly call out who owns which decision.

**Non-goals (Phase 1):**

- Training and fine-tuning workloads (Phase 2).
- Multimodal inference (vision, audio).
- Edge or hybrid-cloud deployments.
- Full procurement BOM with switch counts, cabling, rack drawings.
- Pricing, list-price tracking, or TCO modeling.
- Account management, persistent user data, or SSO. (Sharable URL-encoded configs only.)
- Vendor endorsements or affiliate links.
- Dark mode (Phase 1 ships light mode only).

## 3. Audience and primary use cases

**Primary audience:** IT admins and data center planners at mid-to-large enterprises (500+ employees, on-prem or hybrid IT). Comfortable with traditional infrastructure. Newer to AI. Skeptical of marketing language. Respects concrete sources.

**Secondary audiences:** Platform/infrastructure engineers learning AI workloads; AI engineers needing to communicate sizing requirements to IT in a shared vocabulary; sales engineers building proposals.

**Primary use cases:**

- *"My CIO asked for an AI infrastructure plan by next quarter."* — User lands cold, reads Knowledge, walks through Sizer with their best-guess parameters, exports a shareable summary for review.
- *"AI team says they want to deploy a 70B model. What do I need to buy?"* — User has parameters from AI team, jumps straight to Sizer, iterates on scenarios.
- *"I want to understand what an enterprise inference deployment looks like before I size mine."* — User reads Infrastructure Components example workloads.
- *"I have a sizing in hand and want to validate the deployment architecture."* — User goes to Architecture Designer with constraints, gets a diagram + narrative.

## 4. Phase 1 scope

Four sections, in priority order:

| # | Section | Purpose | Output | Phase 1 status |
|---|---|---|---|---|
| 1 | Knowledge | Educate | 4 markdown pages | Required |
| 2 | Infrastructure Components | Concretize | Overview + 2 example workloads, each with interactive hover diagram | Required |
| 3 | Sizer | Quantify | Server-spec recommendation × 3 scenarios | Required |
| 4 | Architecture Designer | Visualize | Topology diagram + narrative for chosen archetype | Required |

**Out of Phase 1:** Edge, training, multimodal, cloud burst, pricing, BOM, user accounts, dark mode.

## 5. Tech stack and architecture

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) with static export** | Best static-export-with-progressive-enhancement story. |
| Language | **TypeScript** (strict mode) | Required for calc engine and catalog typing. |
| Styling | **Tailwind CSS** | Convention; pairs with shadcn/ui. |
| Component library | **shadcn/ui** (Radix primitives + Tailwind) | Accessible by default, owned source (no runtime dep). |
| Diagram library | **React Flow** (interactive) + **Mermaid** (inline static) | React Flow for Designer/Components; Mermaid in Knowledge prose. |
| State | **URL search params** (Next.js `useSearchParams`) | Sharable configs without backend or auth. |
| Catalog data | **Static JSON imported at build time** | `catalog.json` typed as a TS module. |
| Calc engine | **Pure-TypeScript module**, no UI deps | Testable in isolation. |
| Testing | **Vitest** (unit) + **Playwright** (E2E, optional Phase 1) | Standard. |
| Linting/formatting | **ESLint + Prettier** | Standard. |
| Hosting | **Cloudflare Pages** or **Vercel** | Free tier, instant preview deploys. |
| CI/CD | **GitHub Actions** with preview deploys per PR | Includes JSON schema validation step. |
| Analytics | **Plausible** or **Cloudflare Web Analytics** (privacy-first) | No cookies, no consent banner. |
| License | **MIT** | OSS-friendly. |

**Architecture decisions (locked):**

- **No backend in Phase 1.** Everything is statically rendered or computed client-side. The calc engine runs in the browser. Sharable links are URL-encoded JSON.
- **Single catalog source of truth.** `catalog.json` is imported by Sizer, Designer, and Infrastructure Components. Updating a GPU SKU is a one-file change. Quarterly review cadence; PRs welcome.
- **Open-source from day one.** Public GitHub repo. `CONTRIBUTING.md` documents the catalog schema and contribution flow. CI validates `catalog.json` against the schema on every PR.
- **No auth.** "Save and share" works via shareable URLs.
- **No telemetry beyond pageview/event counts.** No PII; no user input stored server-side.
- **Light mode only.** No dark mode toggle. Single set of design tokens.

### 5.1 Visual identity (locked)

- **Direction:** Documentation-classical. Reference: Stripe docs, Linear, Vercel docs. Generous whitespace, restrained color, clear hierarchy, prose-first.
- **Color:** Forest green as the single accent. Greys + black for text. Red and green reserved for status (warnings, success). Recommended palette anchor: `green-700` for primary actions, `green-50` / `green-100` for hover/background tints. Status: `red-600` for warnings, `green-600` for success (distinct from accent green).
- **Typography:** Inter for body and headings; JetBrains Mono for code, units, and tabular data. Type ramp: H1 36px, H2 28px, H3 22px, body 16px, small 14px, mono 14px.
- **Spacing scale:** Tailwind defaults (4px base).
- **Borders and shadows:** 1px borders in `slate-200`; shadows used sparingly (only on hover popovers and modals).
- **Logo wordmark:** "aisle" lowercase, slight weight emphasis on the first two letters ("ai") to signal the acronym.

## 6. Data model

The single source of truth is `catalog.json` (45 entries across 6 categories — see companion file). Top-level shape:

```ts
type Catalog = {
  _meta: { version: string; last_updated: string; notes: string };
  accelerators: Accelerator[];
  networking: NetworkingComponent[];
  storage: StorageTier[];
  power_cooling: PowerCoolingTier[];
  optimizations: Optimization[];
  serving_engines: ServingEngine[];
};
```

Coverage in Phase 1:

- **Accelerators (12):** NVIDIA H100 SXM/PCIe, H200 SXM, B100, B200, GB200, L40S, L4, A100 80GB; AMD MI300X, MI325X; Vera Rubin (roadmap entry, `roadmap: true`).
- **Networking (9):** NVLink, NVSwitch, IB HDR/NDR/XDR, RoCE 400/800GbE, 100GbE frontend.
- **Storage (3):** local NVMe, parallel file system, object storage.
- **Power/cooling (5):** traditional air, high-density air, RDHX, direct-to-chip liquid, GB200 NVL72 tier.
- **Optimizations (10):** FP16/BF16 baseline, FP8, INT8, INT4, NVFP4; continuous batching, PagedAttention, speculative decoding, LoRA, prefix caching.
- **Serving engines (6):** vLLM, TensorRT-LLM, Triton, TGI, SGLang, Dynamo.

### 6.1 Catalog supplement: `model_families.json`

To support MoE sizing with sensible defaults, a companion file `model_families.json` provides per-family parameters the Sizer needs:

```json
{
  "llama-3.1-70b": { "layers": 80, "kv_heads": 8, "head_dim": 128, "architecture": "gqa" },
  "mixtral-8x22b": { "layers": 56, "kv_heads": 8, "head_dim": 128, "architecture": "moe", "active_params_b": 39 },
  "deepseek-v3": { "layers": 61, "architecture": "moe", "active_params_b": 37, "uses_mla": true },
  "gpt-oss-120b": { "architecture": "moe", "active_params_b": 5 }
}
```

Users select a model family from a dropdown; defaults populate automatically. They can override `active_params_b` if they have better data.

### 6.2 Catalog filtering (locked behavior)

- **Sizer** and **Architecture Designer**: filter out entries where `roadmap: true`. Users cannot size or design against unreleased silicon.
- **Knowledge content** and **Infrastructure Components**: roadmap entries are visible, rendered with a "Roadmap" badge. Cards still pull from the catalog (single source of truth) — they just show what's coming, not what to buy.
- When a roadmap entry graduates (`roadmap: false` + fields populated), it automatically appears in the Sizer/Designer dropdowns on the next build. No code change needed.

### 6.3 Catalog governance (locked)

- **Maintainer:** Sanjana Mohan (gatekeeper). Public PRs welcome; maintainer reviews and merges.
- **Review cadence:** quarterly. Reminder issue auto-created via GitHub Actions on first Monday of each quarter.
- **Schema validation:** every PR runs JSON-schema validation in CI. Invalid entries block merge.
- **Source citation requirement:** every numeric spec must cite a source URL (inline in the entry's `sources` array, or in `catalog-sources.md`). Uncertain values stay `null` rather than being extrapolated.

## 7. Section specifications

### 7.1 Knowledge

**Purpose:** Educational foundation. Four MVP pages, linear learning path, left-rail ToC navigation.

**Pages (see `knowledge-outline.md` for full outlines):**

1. **Overview** (~1,000 words) — Why AI workloads break traditional planning; the five AI workload categories; why Phase 1 focuses on inference; the model-in-memory mental model.
2. **What is Inferencing** (~1,500 words) — The deepest page. Prefill vs decode, why decode is memory-bandwidth-bound, KV cache and linear context growth, TTFT/TPOT, end-to-end latency composition, a worked single-request walkthrough.
3. **Parameters impacting infra decisions** (~1,300 words) — The seven parameters (model size, quantization, context length, concurrent users, RPS, latency SLOs, burst factor). Each parameter section plants a "Try in the Sizer" CTA.
4. **Checklist** (~600 words) — A one-pager. "Before you size," "Decisions IT owns," "Decisions the AI team owns," "Decisions you make together," "Red flags to watch for."

**Implementation:**

- Each page is a markdown/MDX file under `/content/knowledge/`.
- Mermaid diagrams render via `@mermaid-js/mermaid` client-side, lazy-loaded.
- Left-rail ToC auto-generated from frontmatter.
- Glossary popovers surface term definitions on hover. Glossary terms defined once per page (frontmatter list), rendered globally.
- Roadmap silicon (e.g., Vera Rubin) can be referenced via a `<CatalogCard id="..." />` component that pulls live from `catalog.json` and renders with the "Roadmap" badge.

**Acceptance criteria:**

- All four pages published with content matching the outlines.
- ToC navigation works on desktop and mobile.
- Content renders correctly without JS (progressive enhancement); Mermaid diagrams are an enhancement.
- Internal links to relevant Sizer parameters work.
- Glossary tooltips functional on first defined occurrence per page.
- Lighthouse Accessibility score ≥ 95.

### 7.2 Infrastructure Components

**Purpose:** Show the stack in concrete deployments so the abstract becomes recognizable.

**Pages:**

1. **Overview of the stack** — One page walking through the layers: accelerator → intra-node fabric → server → inter-node fabric → inference server → router → API gateway → supporting infra (storage, power, cooling, monitoring). Each layer is a section with a short paragraph and a link to the relevant catalog entries.
2. **Example workload 1 — Enterprise inferencing** — 5,000+ users, 80B model at INT8 quantization, on-prem. Detailed assumptions block at the top. Interactive hover diagram.
3. **Example workload 2 — Departmental inferencing** — 200 users, 13B model, single-node single-GPU.

**Interactive diagrams:**

- Built with **React Flow**. Nodes represent components (GPUs, switches, storage). Hover shows a popover with the catalog entry's name, key specs, and a "see catalog →" link. Click opens the catalog entry in a side panel.
- Each diagram has an "explain this architecture" toggle that overlays annotation arrows with one-sentence descriptions.

**Acceptance criteria:**

- Overview page lists every catalog component category with a one-sentence purpose.
- Both example workload pages render diagrams with hover popovers.
- Hover popovers pull live data from `catalog.json` (no duplication).
- Diagrams export to PNG and SVG.
- Both examples have explicit "assumptions" blocks.

### 7.3 Sizer

**Purpose:** Take user inputs about a workload and produce a server-spec recommendation across three scenarios.

**Inputs (see `sizing-math.md` Section 1 for full schema):** workload_type, parameter_count, model_architecture (dense/GQA/MoE), precision, max_context_tokens, avg_prompt_tokens, avg_output_tokens, concurrent_users, requests_per_user_per_minute, target_TTFT_ms, target_TPOT_ms, burst_factor, redundancy_mode (N/N+1/N+2), serving_engine. Plus optional advanced inputs and the **throughput coefficient override field** (see 7.3.1 below).

**UX:**

- Wizard pattern with left-side stepper: (1) Workload, (2) Model, (3) Traffic, (4) SLOs, (5) Reliability, (6) Advanced (collapsed), (7) Review.
- Each step shows 3–4 sensible options (chips, sliders, dropdowns) plus an "Other" custom-input affordance.
- Persistent right-side "Live result" panel updates as the user changes inputs.
- "Reset to defaults" on each step.
- Inputs encoded into URL search params on every change; sharing the URL reproduces the exact session.

**Outputs (three scenarios side-by-side):**

For each of **Baseline / Burst / Resilient**, show:

- **Server spec per replica:** CPU class (e.g., "dual-socket Xeon Platinum 8480+ or EPYC 9554"), RAM (e.g., "1.5–2 TB DDR5"), GPU SKU + count, NIC config (e.g., "8× ConnectX-7 400 Gb"), local NVMe (e.g., "8–16 TB total"). Each value links to its catalog entry.
- **Replica count:** total servers required.
- **Network fabric:** e.g., "InfiniBand NDR 400 Gb fat-tree" or "100 Gb Ethernet frontend only."
- **Power envelope:** sustained kW total, kW per rack.
- **Cooling tier:** e.g., "Direct-to-chip liquid cooling required (rack exceeds 80 kW)."
- **Confidence badge:** "±15%" for dense models, "Approximate ±30%" for MoE models.
- **Notes and warnings:** any guardrails triggered (TPOT unreachable, model doesn't fit single GPU, etc.).

#### 7.3.1 Throughput coefficient: default + override

The Sizer's tokens/sec-per-GPU estimate is the largest source of uncertainty. Implementation:

- Ship conservative defaults per `(model_family_size_bucket, gpu_sku, serving_engine, precision)` tuple.
- Show the assumed coefficient inline in the Review step ("Assumed throughput: 1,800 tok/s per H200 on a 70B model at FP8 with vLLM — [source]").
- Provide an **override field** in Step 6 (Advanced) labeled "I have my own benchmark." Editing the field replaces the default for the duration of the session.
- The override is URL-encoded so shared links carry the user's number.
- Tooltip next to each default cites the benchmark source URL.

#### 7.3.2 MoE handling

- Model architecture dropdown includes `MoE`. Selecting it triggers an "active_params_b" field that pre-fills from `model_families.json` if the family is known.
- Output cards show "Approximate ±30%" badge for MoE results.
- The Sizer documentation explains the wider error margin and what would tighten it.

**Export:**

- Shareable URL (instant).
- Markdown summary downloadable (single file with all three scenarios + assumptions + sources).
- Printable view (CSS print stylesheet).

**Calc engine implementation:** `lib/sizer/` — pure TypeScript module. See `sizing-math.md` for the 15-step algorithm, lookup tables, and five worked test cases. Each test case in `sizing-math.md` becomes a unit test.

**Acceptance criteria:**

- Wizard completes happy path for the five `sizing-math.md` test cases and produces outputs within ±10% of expected values.
- All three scenarios visible at once on desktop; stacked on mobile.
- Shareable URL round-trips correctly.
- Markdown export downloadable.
- Print stylesheet renders cleanly.
- Guardrail warnings fire on infeasible inputs.
- Override field correctly replaces the default coefficient.
- MoE badge displays for MoE selections.
- Calc engine has 100% line coverage on the 15 algorithm steps.

### 7.4 Architecture Designer

**Purpose:** Recommend a deployment archetype and visualize the topology for the chosen workload. Complements the Sizer (quantitative); the Designer is structural.

**Archetypes (Phase 1 library — 4):**

1. **Single-node single-GPU** — Small model (7B–13B), low concurrency. Example: L40S serving a coding copilot.
2. **Single-node multi-GPU with tensor parallelism** — Mid-large model (30B–70B), fits one chassis. Example: 2× H200 with NVLink for a RAG bot.
3. **Multi-replica behind a router** — High concurrency, identical replicas behind an inference router. Adds KV-cache-aware routing.
4. **Multi-node tensor + pipeline parallelism** — Very large model (200B+) spanning multiple chassis with InfiniBand fabric.

Disaggregated prefill/decode is Phase 2.

**Rule engine (Phase 1 — deterministic):**

- **Input:** workload type, parameter count, precision, concurrent users, latency profile, redundancy mode.
- **Output:** archetype id + parameterized topology.
- **Filters out roadmap silicon** from all suggestions.

Rule precedence:
1. If `parameter_count × bytes_per_element + headroom > max_single_gpu_vram_in_catalog`, force multi-GPU.
2. If multi-GPU and total VRAM fits one chassis (max 8 GPUs × top SKU VRAM), use TP within node.
3. If even an 8-GPU chassis is insufficient, add pipeline parallelism across nodes.
4. If concurrency demands more throughput than one replica can provide, multiply replicas; add router.
5. If `redundancy_mode > N`, add at least one spare replica.

Rule engine lives in `lib/designer/` — pure TypeScript. Each archetype has a template (`templates/archetype-N.json`) describing React Flow nodes and edges.

**UX:**

- Step 1: Pick a use case (same workload categories as Sizer).
- Step 2: Confirm constraints (latency tier, redundancy, model size).
- Step 3: Designer shows recommended archetype with a React Flow topology diagram.
- Step 4: Annotation overlay explains why this archetype was chosen.
- "Compare archetypes" toggle shows alternatives side-by-side.

**Export:**

- PNG/SVG diagram.
- Markdown narrative.
- Shareable URL.

**Acceptance criteria:**

- Picks the correct archetype for each of the five `sizing-math.md` test cases.
- Diagrams render in React Flow with hover popovers.
- Markdown narrative export works.
- "Why this archetype" annotation overlay is informative.
- Roadmap silicon never appears in suggestions.

## 8. UX patterns (shared)

- **Stepper navigation** for Sizer and Designer wizards (non-strict — users can jump back).
- **Live result panel** for the Sizer (desktop right-side; stacked below on mobile).
- **Hover popovers** for catalog entries — consistent look across Components, Sizer, and Designer.
- **"Try in the Sizer"** cross-link CTAs in the Knowledge section.
- **Print-friendly stylesheets** for Knowledge checklist, Sizer summary, Designer narrative.
- **Empty / error / loading states** explicitly designed (loading not relevant for static content; Sizer/Designer show `<NoResults>` if rule engine returns nothing).
- **Keyboard accessibility:** every interaction reachable via keyboard; ARIA roles on diagrams.
- **Mobile target:** read-only on phone (Knowledge, viewing a shared Sizer result). Editing wizards is desktop/tablet primary.
- **Confidence badges** on Sizer outputs (±15% dense / ±30% MoE).

## 9. Acceptance criteria (Phase 1 definition of done)

The product is "done" for Phase 1 when:

- All four sections meet their per-section acceptance criteria above.
- Site builds with no warnings; static export under 5 MB total payload.
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- All five `sizing-math.md` test cases pass automated unit tests in the calc engine.
- A user can complete this end-to-end flow without instructions: land → Knowledge → Sizer → Architecture Designer → export a Markdown plan.
- Shareable URLs round-trip for both Sizer and Designer.
- `README.md` and `CONTRIBUTING.md` explain how to update the catalog and run the project locally.
- **Pilot gate:** 3 live 30-minute interviews completed using the script in Appendix A. Critical issues surfaced are fixed before public launch.

## 10. Multi-agent build decomposition

Recommended way to slice the work for parallel agents:

| Agent | Owns | Depends on | Output |
|---|---|---|---|
| **Foundation** | Repo scaffolding, design tokens (forest green, light-mode-only, Inter + JetBrains Mono), Tailwind/shadcn config, routing, layout, header/footer, catalog typing, MIT license, README/CONTRIBUTING, CI workflow | nothing | `app/`, `lib/catalog/`, `components/ui/`, base layout, license, docs |
| **Knowledge content** | Four MDX pages under `/content/knowledge/`, glossary entries, Mermaid diagrams | Foundation | `/content/knowledge/*.mdx`, glossary JSON |
| **Sizer calc engine** | `lib/sizer/` — pure-TS 15-step algorithm, lookup tables, unit tests | Foundation, catalog | `lib/sizer/index.ts`, `lib/sizer/*.test.ts` |
| **Sizer UI** | Wizard, live results panel, URL state encoding, override coefficient field, MoE badge, export | Foundation, Sizer calc engine | `app/sizer/` |
| **Infrastructure Components** | Overview + 2 example workload pages, React Flow diagrams, catalog popovers | Foundation, catalog | `app/components/` |
| **Designer rule engine + UI** | `lib/designer/` rule engine, archetype templates, React Flow rendering, narrative export | Foundation, catalog, Sizer calc engine (for boundary detection) | `lib/designer/`, `app/designer/` |
| **QA** | Cross-section flows, Lighthouse, accessibility, pilot interview support | All of the above | Test suite, CI gates |

**Critical path:** Foundation → catalog typing → Sizer calc engine → everything else.
**Parallelizable after Foundation:** Knowledge content, Infrastructure Components, Sizer UI, Designer.
**Last to integrate:** QA.

**Interface contracts:**

- `catalog.json` schema frozen in `lib/catalog/types.ts`. Agents reference entries by `id`; never duplicate spec data.
- Sizer calc engine API: `function sizeWorkload(input: SizerInput): SizerOutput`.
- Designer rule engine API: `function pickArchetype(input: DesignerInput): DesignerOutput`.
- Each agent owns a subtree. No agent edits another agent's files except via PR review.

## 11. Phase 2+ roadmap (placeholder)

- Training and fine-tuning workloads.
- Multimodal inference (vision + audio).
- Edge deployment archetype.
- Cloud-burst hybrid scenarios.
- Disaggregated prefill/decode archetype.
- TCO and rough pricing bands.
- Compare-scenarios view in the Sizer.
- Authentication + saved workspaces for repeat users.
- LLM-powered "review my plan" agent.
- Vendor-specific deep dives (NVIDIA Enterprise AI Factory, AMD ROCm path, Dell Validated Designs).
- Dark mode (Phase 1 explicitly excludes; revisit when usage data justifies).

## 12. Open questions / risks

The seven blocking open questions have been resolved (see Appendix B). Remaining items are tracking rather than blocking:

1. **Product naming for sub-features.** "Sizer" and "Designer" are working names. Could rebrand as Phase 1 nears launch.
2. ~~GitHub handle confirmation.~~ Resolved: `github.com/mohan-sanjana/aisle`.
3. **Throughput benchmark coverage.** The Sizer's lookup table will have gaps for less common (model × GPU × engine) tuples. Triage on a case-by-case basis; favor the closest reasonable benchmark and document the assumption.
4. **MoE error margin calibration.** ±30% is a starting estimate. Tighten or loosen post-pilot based on user feedback and real benchmark data.
5. **Analytics platform choice.** Plausible vs Cloudflare Web Analytics. Both free at this scale; decide at launch.

---

## Appendix A — Pilot interview script (30 minutes)

Use this script for the three live pilot interviews that gate Phase 1 launch.

**Setup (5 min)**
1. Thank the participant; explain you're testing a Phase 1 build before launch.
2. Get explicit consent to record (audio is enough; screen optional).
3. Quick context: "What's your role? Have you been asked to plan AI infrastructure in the last 12 months? What's your current AI infrastructure footprint, if any?"
4. Frame the rest: "I'm going to give you two tasks. Please think aloud — narrate what you're looking at, what you're confused by, what you'd click on next. There are no wrong answers; I'm watching the tool, not you."

**Task 1 — First-time Sizer walkthrough (10 min)**

Prompt verbatim: *"Your AI team wants to deploy Llama 3.3 70B for internal customer support, with about 500 concurrent users and roughly 6,000-token average prompts. Use Aisle to figure out what infrastructure you'd need."*

What to watch for:
- Do they go to Knowledge first, or jump straight to the Sizer? (Either is valid; note which.)
- Where do they hesitate on the wizard? Which inputs feel ambiguous?
- Do they understand the difference between concurrent users and concurrent requests?
- Do they look at all three scenario cards (Baseline/Burst/Resilient) or focus on one?
- Do they trust the recommendation? Why or why not?

Do NOT help unless they're truly stuck (60+ seconds of confusion). Note when you intervene.

**Task 2 — Modify and adjust (5 min)**

Prompt: *"The AI team comes back and says they want to support 5× the load during peak. Adjust your plan."*

What to watch for:
- Do they go back to the Sizer, or look at the Designer?
- Do they change `burst_factor`, `concurrent_users`, or both?
- Do they understand what changes in the output?
- Do they notice the URL changed and could be shared?

**Discussion (10 min)**

Six open-ended questions (skip any that feel obvious from the walkthrough):

1. What was the most confusing part of the experience?
2. What was missing — what would you have wanted to see that you didn't?
3. Do you trust this output enough to take it into a procurement conversation? What would make you trust it more?
4. If you had to use this once a quarter, what would be different about how you'd interact with it?
5. Who else at your org would you want to share this with, and why?
6. What's one thing about AI infrastructure planning that this product doesn't address but should?

**Closeout (1–2 min)**
- Thank them, offer to share findings with them.
- Ask if they'd be willing to participate in a follow-up after launch (yes/no/maybe).
- Note their interest level in being a "design partner" for Phase 2.

**Post-interview**
- Write notes within an hour while fresh.
- Tag issues as: blocker (must fix before launch) / important (fix in first patch) / nice-to-have (Phase 2 backlog).
- After three interviews, look for repeat patterns — anything mentioned by 2+ pilots is a launch blocker.

---

## Appendix B — Locked decisions summary

| # | Question | Decision |
|---|---|---|
| 1 | Visual identity | Documentation-classical · light mode only · forest green accent · Inter + JetBrains Mono |
| 2 | Catalog maintenance | Open-source on GitHub · Sanjana as gatekeeper · quarterly review cadence · MIT license |
| 3 | Throughput coefficient | Conservative default per `(family, gpu, engine, precision)` tuple · sourced citation · editable override field |
| 4 | MoE handling | Sensible active-param defaults from `model_families.json` · "Approximate ±30%" badge on MoE · "±15%" on dense |
| 5 | Roadmap silicon | Visible in Knowledge content only · filtered out of Sizer and Designer until graduated |
| 6 | Brand and distribution | Aisle (AI Sizing and Learning Environment) · personal brand by Sanjana Mohan · hosted at `sanjana-mohan.com/aisle` · OSS repo at `github.com/mohan-sanjana/aisle` |
| 7 | Pilot cohort | Sanjana handles recruiting separately · 3 live 30-minute interviews using Appendix A script as Phase 1 launch gate |

---

## Companion artifacts

- **`sizing-math.md`** — 315 lines. Full calculation specification.
- **`knowledge-outline.md`** — 529 lines. Four MVP page outlines.
- **`catalog.json`** — 752 lines. 45 entries across 6 categories.
- **`catalog-sources.md`** — 137 lines. Source URL index.

Together these five documents form a complete Phase 1 spec, ready for the multi-agent build team. The Foundation agent runs first against this spec; the rest of the agents follow once the scaffold is in place.
