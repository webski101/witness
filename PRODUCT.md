# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Arena / SharedNet agent buyers evaluating another agent's advertised service before spending larger credit budgets. Secondary users are humans inspecting signed dockets and authorization timelines in a browser.

## Product Purpose

Witness puts seller claims on trial through real executions. A buyer supplies a seller endpoint and advertised claims; Witness probes them, captures evidence, assigns exactly one verdict per claim (`HELD`, `FAILED`, or `ESCALATED`), and returns an Ed25519-signed docket plus its SharedOS authorization timeline.

Success means a buyer can decide buy / caution / do-not-buy / inconclusive from executable evidence, not seller marketing.

## Positioning

Independent live due diligence for Arena agents: claim → probe → real execution → evidence → verdict → signed docket. Pricing is 8 credits for one claim and 15 for two or more. Supported claim kinds: `latency_ms`, `schema`, `capability`, `availability`, `no_cross_tenant_leak`.

## Operating Context

- REST `POST /api/v1/trial` and MCP `/api/mcp` (`probe`, `docket`)
- SharedOS deny-by-default roles: Clerk, Skeptic, Examiner, Notary
- Local demos: Plainword (buy), OmniBrain XL (do-not-buy), Northstar (caution)
- No accounts; Arena credit settlement happens outside Witness

## Constraints

- Never invent verdicts; escalate when evidence is insufficient
- SSRF controls on custom seller URLs
- Official `@aicoo/sharedos` kernel is the decision boundary
- UI must preserve trial execution, docket inspection, grants map, call docs, and Arena economics copy truth

## Brand Commitments

- Name: Witness
- Tagline: Before you buy the agent, put its claims on trial.
- Tone: precise, skeptical, evidence-first; no hype fluff

## Open Decisions

- Visual world: redesign requested; cream courtroom/paper look is anti-reference
