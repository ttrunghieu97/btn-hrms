# Enterprise Integration Contracts

This directory contains runtime integration contracts for context boundaries.

- `ports/`: cross-context application contracts.
- `acls/`: anti-corruption mapping contracts.
- `adapters/`: runtime adapter implementations for ports.
- `contracts.module.ts`: DI wiring for ports and ACL implementations.

Contracts are designed for phased migration:
- Existing flows can keep current implementation while adapters are adopted incrementally.
- New cross-context integrations should inject a port token from `contracts.tokens.ts` instead of importing foreign repositories.
