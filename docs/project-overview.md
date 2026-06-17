# Aisle — Project Overview

A snapshot of what Aisle is, why it exists, who it's for, and what's built so far. Last updated mid-2026.

## What is Aisle

**Aisle** stands for *AI Sizing and Learning Environment*. It is an open-source web application that helps IT admins and data center planners plan on-premises infrastructure for AI inference workloads. It is part educational curriculum, part interactive sizing tool, part deployment architecture reference.

The name is a deliberate double meaning: the acronym fits the product, and the metaphor fits the audience. The rack aisle is where IT admins literally walk between rows of equipment to think about what they're building.

The project is published at `sanjana-mohan.com/aisle` and open-sourced under MIT at `github.com/mohan-sanjana/aisle`.

## Why it exists

In 2026, most enterprises are being asked to stand up on-prem inference infrastructure for the first time. The IT teams doing the planning come from a discipline where capacity scales linearly with users, where the metrics on the spec sheet tell you what you need, and where the bottleneck is in a familiar place. AI inference doesn't work that way.

A 70-billion-parameter model can need one GPU or eight, depending on choices the AI team makes that don't appear in the application spec. The same workload at different precisions has different infrastructure requirements. The memory pressure depends on user behavior (conversation length) as much as on user count. Power density per rack triples. And the planning conversation has to happen with people speaking different vocabularies.

Aisle exists to bridge that gap. It teaches the new vocabulary, computes the new math, and recommends the new deployment shapes. It does not require the user to become an ML engineer.

## Goals (Phase 1)

- Educate IT admins enough to plan on-prem LLM inference infrastructure without needing to become ML engineers.
- Produce a server-spec-level sizing recommendation (CPU class, RAM, GPU SKU and count, NIC, local NVMe, replica count, fabric, power, cooling) that an admin can take into a procurement conversation.
- Output three scenarios per sizing run: baseline, burst, and resilient (N+1 or N+2 redundancy).
- Reference common hardware (NVIDIA H100/H200/B100/B200/L40S/L4, AMD MI300X/MI325X) without endorsing any vendor.
- Make the planning conversation between IT and AI teams more productive by giving both sides a shared vocabulary and a shared planning artifact.

## Non-goals (Phase 1)

- Training and fine-tuning workloads (Phase 2)
- Multimodal inference (vision, audio)
- Edge or hybrid-cloud deployments
- Full procurement BOM with switch counts and cabling
- Pricing or TCO modeling
- Account management or persistent user data
- Vendor endorsements

## Target audiences

**Primary:** IT admins and data center planners at mid-to-large enterprises (500+ employees, on-prem or hybrid IT). Comfortable with traditional infrastructure such as compute, storage, networking, power, and cooling. Newer to AI. Skeptical of marketing language. Respect concrete numbers and citations.

**Secondary:**
- Platform and infrastructure engineers learning AI workloads for the first time.
- AI engineers who need to communicate sizing requirements to IT in a shared vocabulary.
- Sales engineers and solution architects building proposals.

## The four sections

Aisle is structured as four surfaces, each serving a different stage of the user's journey.

### 1. Knowledge (curriculum)
A progressive seven-module learning path that builds vocabulary and intuition from scratch:

1. **M1.** What is AI inference? (training vs inference, workload categories, why on-prem)
2. **M2.** Why your existing playbook breaks (four assumptions that don't survive contact with inference; the meta point that planning is now collaborative and recurring)
3. **M3.** How a model actually serves a request (prefill, decode, why memory bandwidth dominates)
4. **M4.** The KV cache, the silent capacity killer (concrete memory math)
5. **M5.** The seven parameters that drive sizing (planned)
6. **M6.** A worked example, end-to-end (planned)
7. **M7.** The IT-and-AI planning conversation (planned)

Each module includes inline glossary tooltips, optional Mermaid diagrams, and a "Try this in the Sizer" cross-link that opens the Sizer pre-filled to demonstrate the concept.

**Status:** Modules 1 to 4 complete. Modules 5 to 7 are placeholder stubs.

### 2. Infrastructure Components (reference)
Three pages that show the inference stack concretely:

- **Overview of the stack** — seven layers (accelerator, intra-node fabric, inter-node fabric, storage, serving engine, power and cooling, optimization techniques) rendered as labeled cards pulling live from the catalog.
- **Example workload 1 — Enterprise inferencing** — 5,000+ users, 70B model at FP8, multi-rack deployment with InfiniBand, liquid cooling. Interactive React Flow diagram with hover popovers for every component.
- **Example workload 2 — Departmental inferencing** — 200 users, 13B model, single-rack deployment with standard air cooling.

**Status:** Not yet built. Agent briefed; waiting for session limit window.

### 3. Sizer (calculation engine and wizard)
The centerpiece of the application. A guided wizard takes a workload description (model, precision, context, concurrency, SLOs, redundancy) and produces a server-spec recommendation across three scenarios. The output includes:

- A live "deployment at a glance" schematic
- An educational summary explaining the drivers behind the sizing
- Three scenario cards (baseline / burst / resilient) with full server specs
- A confidence badge (±15% dense, ±30% MoE)
- Surfaced guardrails when SLOs or boundary conditions are violated
- Markdown export and shareable URL

**Status:** Complete. Calculation engine has 74 passing tests across three suites. UI has been through three rounds of feedback. Engine improvements applied: TTFT feasibility check, bandwidth-headroom GPU promotion rule, server consolidation for single-GPU PCIe replicas, MoE handling with confidence margin, and reasoning-model default output-token bumps.

### 4. Architecture Designer (rule engine and topology)
A wizard that picks an appropriate deployment archetype for a workload and visualizes the topology. Where the Sizer answers "how much," the Designer answers "what does it look like."

**Status:** Spec written. Not yet built. Will follow Components.

## Shared infrastructure

### Catalog
The single source of truth for hardware and software specs. Lives at `data/catalog.json`. Contains:

- 12 accelerators (NVIDIA H100 SXM and PCIe, H200, B100, B200, GB200, L40S, L4, A100; AMD MI300X, MI325X; NVIDIA Vera Rubin as a roadmap entry)
- 9 networking components (NVLink, NVSwitch, InfiniBand HDR/NDR/XDR, RoCE 400/800GbE, 100GbE frontend)
- 3 storage tiers (local NVMe, parallel file system, object storage)
- 5 power and cooling tiers (traditional air, high-density air, RDHX, direct liquid, GB200 NVL72)
- 10 optimization techniques (FP16/BF16/FP8/INT8/INT4/NVFP4, continuous batching, PagedAttention, speculative decoding, LoRA, prefix caching)
- 6 serving engines (vLLM, TensorRT-LLM, Triton, TGI, SGLang, NVIDIA Dynamo)

Every numeric spec is sourced. Updates happen via PR; CI validates against a Zod schema.

### Glossary
A keyed map of 20+ inference terms used for inline hover tooltips in the Knowledge curriculum.

### Design system
Documentation-classical aesthetic (Stripe docs, Linear, Vercel docs as references). Light mode only, no dark variants. Forest green accent. Inter for prose. JetBrains Mono for specs and numbers.

## Where the project stands

**Built and shipped:**
- Full Sizer (calculation engine + wizard UI + 74 passing tests + Markdown export)
- Knowledge modules 1 through 4 (M1: what is inference; M2: broken assumptions; M3: prefill/decode mechanics; M4: KV cache)
- Foundation scaffolding (Next.js 15, TypeScript strict, Tailwind 3 with @tailwindcss/typography, shadcn/ui, MDX via next-mdx-remote)
- Canonical catalog (45 entries, all sourced)
- Glossary (20+ terms with hover tooltips)
- Public GitHub repository, MIT licensed

**Remaining for Phase 1:**
- Knowledge modules 5, 6, 7
- Infrastructure Components (3 pages with interactive diagrams)
- Architecture Designer (rule engine + visualization)
- Pilot interviews (3 live 30-minute sessions per the spec)
- Public launch

## Phase 2 roadmap (placeholder)

- Training and fine-tuning workloads
- Multimodal inference (vision + audio)
- Edge deployment archetype
- Cloud-burst hybrid scenarios in the Sizer
- Disaggregated prefill/decode archetype in the Designer
- TCO and rough pricing bands
- Compare-scenarios view
- Authentication and saved workspaces for repeat users
- LLM-powered "review my plan" agent
- Vendor-specific deep dives
- Dark mode (explicitly excluded from Phase 1)
