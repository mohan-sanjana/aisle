# Aisle — Build Post-Mortem (Phase 1, partial)

Honest reflection on the build process so far. Not defensive. Goal is to surface what worked, what didn't, and what to do differently going forward.

## What went well

**Iterative feedback loops worked.** Most rounds of "this isn't quite right" produced a meaningfully better version on the next pass. The conversation pattern (you point at the problem, I fix it, you verify) was efficient.

**Pressure testing improved quality.** When you asked whether the four "broken assumptions" in M2 were actually correct, two of them turned out to be loosely framed. The revised version is sharper. This kind of skeptical pass is high-value and underused in the rest of the process.

**The Sizer fundamentally works.** Calc engine has 74 passing tests against 5 worked cases and 25+ edge cases. The outputs align with the worked examples in `docs/sizing-math.md`. The UI is responsive, exportable, and educational.

**Voice and style stayed consistent.** Once we settled on the doc-classical aesthetic and the "no em dashes, simple full sentences" voice, modules and components held that line across many file boundaries.

**Catalog architecture is solid.** Single source of truth, Zod-validated, sourced. Adding a new SKU is a one-file change. This will scale to Phase 2.

**MDX migration eventually succeeded.** The third approach (`next-mdx-remote/rsc`) is the right one for content-as-data. Documentation in the engineering spec should help future engineers avoid the dead-ends I hit.

## What didn't go well

### Infrastructure-level (mostly outside our control, but coping strategies could be better)

- **API 500 errors during agent spawn.** Hit twice with the Knowledge content agent. Each cost a turn to diagnose.
- **Session limits mid-work.** The Sizer calc engine agent timed out after 13 minutes with 30 tool calls; the Components agent failed to spawn entirely on the first try. Both required either retry or inline fallback.
- **Coping strategy was reactive, not planned.** I had no playbook for "agent failed; what now?" Each failure required improvising.

### Quality issues that better upfront work could've prevented

- **Sizer engine bugs surfaced only after tests.** The L40S boundary check was missing (engine would pick L40S for 70B models). The cooling tier defaulted to air for high-power deployments (it picked the lightest cooling tier that fit one server per rack, not the realistic dense-packed answer). Both bugs got fixed quickly, but they should have been caught before shipping the engine, not after.
- **The four "broken assumptions" in M2 were loosely framed.** Your pressure test found that "compute is the bottleneck" and "storage is decoupled from compute" weren't quite the right framings. Should have been pressure-tested internally before publishing.
- **M1 had too many em dashes.** You'd already told me your style preferences; I overused em dashes anyway and had to rewrite. The voice constraint should have been encoded in every agent brief.
- **Knowledge content was originally planned as 4 flat pages.** You correctly pushed for a 7-module progressive curriculum. The original brief and outline missed the educational structure entirely.
- **Knowledge UI shipped with two layout problems.** Sidebar breakpoint was too restrictive (`lg:` 1024px instead of `md:` 768px). Module number badges were too subtle. Both caught in your first review of the rendered output.
- **Sizer UI feedback rounds.** Precision boxes overflowing, RPM input zero-prefix bug, schematic fabric label clipping, networking over-recommendation, server consolidation. Five rounds of feedback for what should arguably have been one or two.

### Workflow and pacing

- **Three attempts to set up MDX.** First `@next/mdx` with auto-injection (didn't work for MDX-as-content), then `@next/mdx` with explicit components prop (still didn't work), then `next-mdx-remote` (worked). The third option is the documented best practice for "MDX as importable content." I should have known this from the start.
- **Engine improvements arrived late.** TTFT feasibility check, bandwidth-headroom promotion, MoE handling, reasoning-model defaults, and server consolidation were all added after the engine shipped. They were good additions, but they should have been part of the initial spec.
- **22 tasks across many micro-iterations.** Each individual iteration was small. Aggregated, they're a lot. Some of this is healthy product iteration. Some is preventable rework.
- **Commit discipline.** The repo is on GitHub but we haven't committed after each logical unit of work. By the time we go to commit, many things have changed and the commit history loses fidelity.

## Lessons (concrete, actionable)

1. **TDD the calculation engines.** If we had written the five worked test cases first and implemented the engine to pass them, the L40S boundary and cooling tier bugs would have been caught before they shipped. Recommendation: any future engine (Architecture Designer rule engine, future scenario types, future workload categories) starts with tests.

2. **Pressure-test claims internally before publishing.** "Would a smart skeptic agree?" is a useful internal pass on every educational claim. The user's M2 pressure test should have been an internal step in M2's drafting, not a post-publication correction.

3. **Encode voice constraints in every agent brief.** "No em dashes" and "simple but full sentences" should have been in every Knowledge / Components prose brief. They were in some, not in others. Make this a template.

4. **Visual QA at multiple viewports before committing UI.** Capture and review at ~360px (mobile), ~768px (tablet), and ~1280px (desktop) before declaring UI done. The Knowledge sidebar breakpoint issue and the precision overflow would have been caught with this.

5. **Pick proven libraries the first time.** The MDX path was three attempts. Recommendation: when picking a library for a content-as-data use case, default to `next-mdx-remote`. `@next/mdx` is for content-as-pages.

6. **Plan for agent failure.** Have an inline fallback ready before spawning agents for time-sensitive work. Budget for retries. If two attempts fail, switch to inline immediately rather than trying a third time.

7. **Spec the engine's nuances upfront.** Headroom rules, feasibility checks, edge-case handling, special-case behaviors (MoE, reasoning) should be part of the engine spec before the build, not tacked on after. Recommendation: run a "what edge cases will surface?" exercise before any calculation-engine build.

8. **Commit more often.** A commit per logical unit (after each Sizer improvement, after each module ships, after each round of UI feedback). The repo's git history should tell the story of the build.

9. **Plan content workflow on day one.** We migrated to MDX after M1 was already written in TSX, which meant re-doing M1. If we'd anticipated the editorial need from the start, MDX would have been in the Foundation scaffold. For any content-heavy section, pick the format on day one.

10. **Surface engine assumptions in the UI.** The Sizer's throughput coefficients are based on public benchmarks that vary 50%+ in real production. The override field exists, but the default values should have a more prominent confidence note. Users should know they're looking at an estimate, not a measured number.

## Specific things to revisit

- **M3 and M4 could benefit from the same pressure test as M2.** Especially M3's claim about "decode is bandwidth-bound" (correct, but edge cases like small models or speculative decoding deserve a caveat).
- **The Sizer's cooling-tier algorithm** assumes dense packing (~80 kW/rack). Sparse facilities can't always do this. A `facility_profile` input would respect real constraints.
- **Server consolidation** is now in the engine, but its UI surfacing is light. The schematic shows fewer boxes, but it could explain more about the tradeoff. Right now the "consolidation" driver bullet in the summary explains it, but only when consolidation actually fires.
- **The TPOT feasibility warning** is great, but the prefill FLOPs estimate is a lower bound. Real prefill includes attention overhead and engine scheduling. The warning copy should note this.

## Things we should be doing but aren't

- **Visual regression testing.** No screenshot testing in CI. Layout regressions could ship.
- **Performance budgets.** No Lighthouse CI. Bundle sizes could creep.
- **Accessibility audits.** Relying on shadcn/ui defaults. Should test with a screen reader and a keyboard-only navigator.
- **Browser compatibility testing.** Assuming evergreen browsers. Should at least verify on Safari (which often has its own opinions on flexbox and grid).
- **Pilot interview scheduling.** The script is in `aisle-spec.md` Appendix A. Nobody has been booked. This is a launch gate per the spec.
- **A commit hook that runs `validate-catalog` before letting catalog changes in.** Currently CI runs it, but a local pre-commit hook would catch issues earlier.

## What's actually fine

A counterweight to the critical list above.

- The four-section product structure (Knowledge, Components, Sizer, Designer) is clean and works.
- The catalog-as-source-of-truth pattern is solid and will scale to Phase 2.
- The MDX content workflow (now that it works) is genuinely pleasant to edit.
- The open-source posture (MIT, public repo, contributor-friendly) is right for the audience.
- The Sizer's pure-function calc engine + URL-state UI architecture has held up across every UI iteration without breaking the engine.
- The voice and tone, once locked, has stayed consistent.

## Bottom line

The build is in good shape. The remaining Phase 1 work (M5–M7 content, Architecture Designer, pilot interviews) is concrete and bounded. The lessons above are real but mostly fall into the category of "do less reactive work next time, more upfront discipline." The product itself is in better shape than the build process suggests.
