# Decision Weaver

> Enterprise-grade decision intelligence and rules governance platform for executing, explaining, and evolving high-stakes business decisions with confidence.

---

## Table of Contents

* Overview
* Why This Exists
* Enterprise Highlights
* Key Features
* Architecture
* Technology Stack
* Project Structure
* Core Workflows
* Security
* Database Design
* API Overview
* Installation
* Configuration
* Testing
* Deployment
* Performance
* Roadmap
* Documentation
* Screenshots
* Contributing
* License
* Author
* Acknowledgements

---

# Overview

Decision Weaver is part of the ValtariOS platform and provides enterprise decision infrastructure for teams that need deterministic, auditable, and governable automated decisions. It serves analysts, reviewers, operators, executives, and auditors by combining case intake, rule authoring, inference execution, replay, and operational monitoring in one system. The platform addresses the need to move from ad hoc decision logic to governed decision operations with explainability, traceability, and human oversight.

---

# Why This Exists

## Business Problem

Organizations often make critical decisions across claims, transactions, alerts, authorizations, and other case-driven workflows using fragmented spreadsheets, embedded business logic, or opaque automation. That creates inconsistent outcomes, weak governance, slow iteration, and limited executive visibility.

## Technical Challenge

Reliable decision automation requires versioned rules, confidence scoring, contradiction detection, replayable outcomes, secure tenant isolation, audited mutations, and operational observability. The engineering challenge is to make those capabilities usable by both technical and non-technical stakeholders without sacrificing determinism or control.

## Solution

Decision Weaver combines a deterministic inference engine, a governed rules workbench, operational dashboards, and tenant-aware APIs on top of a secure data platform. It gives teams a single place to ingest cases, evaluate them against managed rules, inspect decision traces, review historical outcomes, and continuously improve decision quality.

---

# Enterprise Highlights

* Enterprise-grade architecture
* Multi-tenant design
* Secure authentication
* Role-based access control (RBAC)
* Row-Level Security (RLS)
* Audit logging
* Durable workflow execution - in progress
* Retry and recovery mechanisms
* Queue-based processing - coming soon
* Event-driven architecture
* AI-assisted automation - coming soon
* RESTful APIs
* Real-time dashboards - in progress
* Structured observability
* Production-ready infrastructure
* Scalable cloud deployment
* SOC 2 aligned security practices - in progress
* HIPAA-ready architecture (where applicable) - coming soon

---

# Key Features

## Core Capabilities

* Deterministic inference engine with weighted candidate selection and confidence scoring
* Rules Studio with visual condition tree builder and live JSON editing
* Case management with facts, evidence, history, and decision trace views
* Replay workflows for comparing historical cases against current rule sets
* Operations dashboards for decision health, distributions, and governance metrics

## Administrative Features

* Organization settings and inference policy controls
* Role-aware access using organization membership and dedicated user roles
* Webhook configuration, delivery logs, and API key-based ingest management

## Automation

* REST ingest endpoint for creating cases from external systems
* Webhook firing with HMAC signing and exponential backoff delivery handling
* Daily metrics aggregation through background edge functions

## Reporting

* Decision distribution and confidence trend dashboards
* Governance insights for rule conflicts and dependencies
* Audit event timelines and webhook delivery visibility

---

# Architecture

## High-Level Architecture

> See the in-app `/architecture` route for the current enterprise architecture view. Standalone repository diagram: coming soon.

---

## System Components

### Frontend

React and TypeScript single-page application with routed experiences for dashboards, cases, rules, simulation, operations, API docs, architecture, and settings.

### Backend

Supabase-backed application services plus Deno edge functions for inference execution, case ingest, metrics aggregation, and demo data seeding.

### Database

PostgreSQL stores organizations, users, roles, cases, facts, rules, inference runs, metrics, outcomes, audits, webhooks, and related governance data.

### Authentication

Lovable Cloud managed authentication supports email/password and Google OAuth, with gated mutations and organization-aware access control.

### Storage

Supabase storage is part of the managed backend stack; repository-specific storage workflows are in progress.

### AI Services

AI service integrations are part of the broader ValtariOS vision; direct production AI provider usage in this repository is coming soon.

### Background Workers

Edge functions perform inference, ingest processing, metrics aggregation, webhook handling, and onboarding data seeding.

### Integrations

Current integrations include API-key based ingestion, signed outbound webhooks, and platform-level ValtariOS navigation and event contracts.

---

## Data Flow

Users or external systems create cases through the UI or ingest API. Cases and facts are stored under an organization boundary, then evaluated by the deterministic inference engine against enabled rules. The engine computes candidate outcomes, contradictions, confidence, and trace details, persists the result, emits related events and webhooks, and exposes the outcome through dashboards, case detail views, operations screens, and replay workflows.

---

# Technology Stack

## Frontend

* React 18
* TypeScript 5
* Vite 5
* Tailwind CSS v3
* shadcn/ui
* TanStack Query
* React Router

## Backend

* Supabase
* PostgreSQL
* Deno Edge Functions

## Infrastructure

* Lovable Cloud hosting
* Supabase Storage
* Supabase Authentication

## AI

* AI-assisted automation roadmap - in progress
* Direct OpenAI integration - coming soon
* Direct Anthropic integration - coming soon

## DevOps

* GitHub
* CI/CD - in progress
* Monitoring - in progress
* Logging via audit events and operational dashboards

---

# Project Structure

```text
project/
│
├── src/
│   ├── components/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── pages/
│   └── test/
├── supabase/
│   ├── functions/
│   ├── migrations/
│   └── config.toml
├── public/
├── .lovable/
├── README.md
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── eslint.config.js
└── vitest.config.ts
```

---

# Core Workflows

## Workflow One

Purpose

Evaluate business cases against governed rules and produce auditable decisions.

Process

A user or API client creates a case, facts are attached, inference runs against enabled rules, and the resulting trace, confidence, and decision are stored.

Expected Result

A replayable decision with transparent rule firings, governance signals, and operational visibility.

---

## Workflow Two

Purpose

Author, govern, and refine decision logic without losing control of production behavior.

Process

Teams create and update rules in Rules Studio, inspect conflicts and dependencies, review rule versions, and test outcomes through simulation and replay.

Expected Result

Safer rule changes, stronger governance, and faster iteration on decision policies.

---

## Workflow Three

Purpose

Operate decision services with auditability and cross-system integration.

Process

Operators review dashboards and audit events, monitor engine health, manage webhooks and API access, and consume outbound events in downstream systems.

Expected Result

Observable, governable, and organization-scoped decision operations.

---

# Security

## Authentication

Authentication is managed through Lovable Cloud and Supabase Auth with support for email/password and Google OAuth.

## Authorization

Authorization uses organization scoping, a dedicated `user_roles` table, role checks via `has_role(...)`, and Row-Level Security across public tables.

## Data Protection

Sensitive access is mediated through the managed backend platform, tenant boundaries, API keys for ingest, and signed webhook delivery. Additional formal data-handling documentation is in progress.

## Audit Logging

Audit events capture governance and operational activity, and delivery logs record outbound webhook attempts.

## Input Validation

Frontend forms use structured validation patterns, while edge functions validate request methods, headers, and payload shape before processing.

## Error Handling

The frontend includes a global error boundary and user-facing toast notifications; edge functions return explicit HTTP errors and retry webhook deliveries with backoff.

## Compliance

RLS, RBAC separation, auditable decision traces, and signed integrations support enterprise security practices. SOC 2 and HIPAA-specific compliance documentation is in progress.

---

# Database Design

## Overview

The database is organized around multi-tenant decision operations, with organizations at the root and related tables for users, cases, facts, rules, inference results, governance events, and external integrations.

## Core Tables

* organizations
* cases
* facts
* rules
* inference_runs
* user_roles
* audit_events
* webhooks
* webhook_deliveries
* case_outcomes
* rule_versions

## Relationships

Organizations scope users, roles, cases, rules, metrics, APIs, and webhooks. Cases relate to facts, inference runs, and outcomes. Rules relate to versions and drive inference traces. Webhooks relate to delivery logs for outbound event tracking.

## Indexing Strategy

The schema includes targeted indexes for organization scoping and frequent lookup paths, including dedicated indexes for rule versions and case outcomes to support version history and outcome retrieval efficiently.

---

# API Overview

## Authentication

The primary external API uses organization-scoped API keys passed through the `x-api-key` header.

## Primary Endpoints

| Endpoint | Purpose |
| -------- | ------- |
| `POST /functions/v1/ingest-case` | Create a case and optional facts from an external system |
| `POST /functions/v1/run-inference` | Execute deterministic inference for a case or submitted facts |
| `POST /functions/v1/aggregate-metrics` | Aggregate daily operational metrics |
| `POST /functions/v1/seed-demo-data` | Seed onboarding demo data for a tenant |

## Response Format

Responses are JSON-based and return structured success or error payloads. API documentation for request fields, status codes, and rate limits is available in the in-app `/api-docs` route.

---

# Installation

## Prerequisites

* Node.js 20+
* npm

## Clone Repository

```bash
git clone <repository-url>
```

## Install Dependencies

```bash
npm install
```

## Configure Environment

Create a `.env` file and add the required environment variables.

## Start Development Server

```bash
npm run dev
```

---

# Configuration

Required frontend environment variables include `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`. Configuration also spans organization settings, inference thresholds, notification preferences, webhook endpoints, API keys, and Supabase-managed authentication and storage behavior.

---

# Testing

## Unit Tests

Frontend unit tests run with Vitest and Testing Library, and engine modules include focused Deno tests.

## Integration Tests

Edge functions include integration-oriented tests for inference and ingest flows.

## Manual Testing

Manual validation should cover dashboards, case flows, rules authoring, simulation, replay, settings, and API docs across authenticated and guest access paths.

## Performance Testing

Dedicated performance testing documentation is coming soon.

---

# Deployment

## Development

Run the Vite development server locally against the managed backend configuration.

## Staging

Staging workflow documentation is in progress.

## Production

Production deployment is handled through Lovable publishing, with edge functions deploying alongside the project.

---

# Performance

## Optimization

The application uses modular inference logic, React query-based data fetching, and focused dashboard components to keep decision workflows responsive.

## Caching

TanStack Query provides client-side caching and revalidation for application data.

## Background Processing

Metrics aggregation and webhook delivery handling run through backend functions; queue-based processing is coming soon.

## Scalability

Tenant-aware Postgres design, RLS boundaries, API-based ingest, and cloud-managed services support scalable growth across organizations.

---

# Roadmap

## Current Release

Current functionality includes governed rule management, deterministic inference, case workflows, replay, operations dashboards, API ingest, webhooks, rule versioning, and case outcomes.

## Next Release

Planned improvements include deeper outcome labeling and calibration, richer audit event streams, real-time dashboard updates, and expanded human-in-the-loop workflows.

## Future Vision

Long-term direction includes broader ValtariOS modules, packaged integrations, stronger platform services, and expanded AI-assisted decision operations.

---

# Documentation

| Document | Description |
| -------- | ----------- |
| Architecture | In-app enterprise architecture reference at `/architecture` |
| API | In-app endpoint reference at `/api-docs` |
| Database | Supabase schema and generated types in `src/integrations/supabase/types.ts` |
| Deployment | README deployment notes; expanded guide coming soon |
| Workflows | Product workflows described in this README and UI flows |

---

# Screenshots

> Add screenshots, diagrams, dashboards, or workflow illustrations. Current assets and dedicated screenshots section are coming soon.

---

# Contributing

Follow existing project conventions for React, TypeScript, Tailwind, Supabase integration, and semantic design tokens. Keep changes scoped, validate with existing lint and test commands, and use normal GitHub pull request review workflows. Additional contributor guidance and branch strategy documentation are coming soon.

---

# License

License file not currently present in the repository. Licensing details are coming soon.

---

# Author

**George Rios**

Founder & Software Engineer

**Valtaris Technologies**

---

# Acknowledgements

Decision Weaver builds on React, Vite, Tailwind CSS, shadcn/ui, Supabase, TanStack Query, Vitest, Deno, Lucide, Recharts, and the broader open-source ecosystem that supports modern enterprise application development.
