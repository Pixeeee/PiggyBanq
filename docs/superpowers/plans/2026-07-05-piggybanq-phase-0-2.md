# PiggyBanq Phase 0-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Phase 0-2 foundation for PiggyBanq with self-custodial wallet guardrails and testnet Stellar helpers.

**Architecture:** Create a pnpm/Turborepo TypeScript monorepo with shared packages for types and Stellar logic, a Fastify/Prisma server boundary, and scaffolded web/mobile clients. Keep secret key material client-only and use public-key-only wallet linkage.

**Tech Stack:** Node 24, pnpm workspaces, TypeScript-style ESM modules, Node test runner for dependency-free core tests, planned Fastify/Prisma/Next/Expo dependencies.

---

## File Structure

- `package.json`, `pnpm-workspace.yaml`, `turbo.json`: monorepo commands and package topology.
- `AGENTS.md`, `CLAUDE.md`, `README.md`: product/security constraints and Stellar gotchas.
- `packages/types/src/*`: KYC constants, DTO factories, validators, and ledger helpers.
- `packages/stellar-core/src/*`: network constants, address validation, polling, payment confirmation, trustline helpers.
- `server/prisma/schema.prisma`: full Phase 0 schema inventory.
- `server/src/*`: Fastify bootstrap and module boundaries.
- `apps/web/*`, `apps/mobile/*`: Phase 1-2 client scaffolds only.
- `tests/*.test.mjs`: dependency-free behavioral tests for Phase 0-2 core logic.

## Tasks

### Task 1: Monorepo Metadata and Guardrails

- [ ] Create root package/workspace files.
- [ ] Add README with Phase 0-2 scope and Stellar testnet rationale.
- [ ] Copy Stellar gotchas into `AGENTS.md` and `CLAUDE.md`.

### Task 2: Red Tests for Core Helpers

- [ ] Add tests for KYC limit, address validation, polling state, payment confirmation, trustline requirements, and savings ledger math.
- [ ] Run `npm.cmd test`.
- [ ] Expected result before implementation: tests fail because modules do not exist.

### Task 3: Shared Types Package

- [ ] Implement `packages/types/src/kyc.ts`.
- [ ] Implement `packages/types/src/wallet.ts`.
- [ ] Implement `packages/types/src/ledger.ts`.
- [ ] Run `npm.cmd test`.

### Task 4: Stellar Core Package

- [ ] Implement `packages/stellar-core/src/network.ts`.
- [ ] Implement `packages/stellar-core/src/address.ts`.
- [ ] Implement `packages/stellar-core/src/polling.ts`.
- [ ] Implement `packages/stellar-core/src/payment-confirmation.ts`.
- [ ] Implement `packages/stellar-core/src/trustline.ts`.
- [ ] Run `npm.cmd test`.

### Task 5: Server and Database Skeleton

- [ ] Add Prisma schema with required entity inventory and indexes.
- [ ] Add Fastify server bootstrap and module placeholders for auth, wallet, savings, anchor, budget, social, milestones, and profile.
- [ ] Ensure comments state that server never accepts plaintext secret keys.

### Task 6: Client Skeletons

- [ ] Add Next.js web scaffold with no landing page route.
- [ ] Add Expo mobile scaffold with local-wallet placeholder screens and backup-flow notes.
- [ ] Keep secret storage implementation as client-only modules.

### Task 7: Verification

- [ ] Run `npm.cmd test`.
- [ ] Run `npm.cmd run build` if dependencies are installed; otherwise record the dependency blocker.
- [ ] Re-read prompt Phase 0-2 requirements and report implemented scope plus gaps.

## Self-Review

The plan intentionally excludes landing page and Phase 3-8 features. There are no placeholder tasks for the Phase 0-2 helper layer; framework-dependent runtime verification depends on dependency installation.

