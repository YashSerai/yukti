# Baseline Governance

## 1. Baseline Roles

- Product / Requirement Baseline: confirmed requirement sources, target state, goals and scope, users and scenarios, acceptance criteria, non-goals, workflow constraints, open questions, change records, and approved spec intent.
- Architecture / Runtime Boundary Baseline: canonical owners, contracts, source-of-truth boundaries, dependency direction, compatibility, runtime-ready boundaries, and retirement state.

## 2. Design Defect

A confirmed error, gap, contradiction, or wrong abstraction in the relevant requirement, design, or baseline.

- Fix the defective requirement, design, or baseline first.
- Then align implementation to the corrected baseline.
- Do not patch implementation around a defective baseline.

## 3. Implementation Drift

Implementation, planning, review, or documentation has deviated from a confirmed, correct, unchanged requirement or architecture baseline.

- Return to the baseline by the simplest stable path.
- Do not update the baseline to match drift without explicit review.

## 4. Compatibility Aliases

- Architecture Defect means an architecture-scoped Design Defect.
- Architecture Drift means architecture-scoped Implementation Drift.
- New findings report Design Defect or Implementation Drift with `scope: requirements | architecture | both`.

## 5. Baseline Check Protocol

Before non-trivial changes:

1. Read the latest Product / Requirement Baseline candidate.
2. Read the latest Architecture / Runtime Boundary Baseline candidate.
3. Compare current work against requirement acceptance and architecture boundaries.
4. Check for new unrecorded anti-patterns.
5. Report aligned, Design Defect, Implementation Drift, missing-authority, or needs-clarification.

## 6. Architecture Review

Review ownership integrity, module boundaries, contract changes, dependency cascades, dependency direction, retirement completeness, and net entropy after each non-trivial change.

## 7. Hard Boundaries

- This file is the constitution for Yukti's Aegis workspace.
- Baseline snapshots are evidence, not authority.
- ADRs record decisions but do not replace baseline governance.
- Changes to this file require explicit user review.

