# Engineering case study

## Problem

Port calls, customs declarations, vehicle manifests, risk decisions, and operational analytics are often represented in separate tools. This prototype tests whether those workflows can be made understandable in one responsive Azerbaijani interface.

## Product boundary

The repository is a presentation and interaction prototype. It uses synthetic 2026 data and does not connect to a real customs, port, identity, payment, or vessel-tracking system.

## Frontend architecture

```text
route-level operational views
        |
        v
shared domain models and synthetic fixtures
        |
        +--> workflow state and filters
        +--> Leaflet map layers
        +--> Recharts analytics
        +--> responsive presentation components
```

TypeScript domain contracts keep declarations, vehicles, vessels, alerts, and risk states consistent across the interface. Synthetic fixtures make the demo deterministic and prevent accidental use of real operational or personal data.

## Engineering decisions

- Azerbaijani is the primary product language rather than an afterthought.
- Operational state is visible through consistent status, risk, and timeline patterns.
- Tables, maps, and charts represent the same typed domain data.
- Responsive layouts preserve the core workflow on smaller screens.
- The demo clearly distinguishes implemented interaction from missing production integration.

## Production requirements

A real deployment would require authoritative API integrations, identity federation, role and field-level authorization, immutable audit trails, data-retention policy, encryption and key management, event-driven synchronization, observability, disaster recovery, accessibility validation, and formal security review.

## Validation

- `npm run build` must pass in CI.
- Core routes should be checked at desktop and mobile widths.
- Synthetic records must remain clearly labelled.
- No real personal, customs, or commercial data may be committed.
- Map, filter, and status interactions must retain keyboard-visible focus.
