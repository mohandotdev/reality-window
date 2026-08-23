# Reality Window

> **Turn a real-world assumption into a continuously verifiable signal.**

Reality Window is an evidence-driven monitoring system that turns a natural-language assumption about the real world into a repeatable verification workflow.

Instead of asking an LLM to answer a question from its memory, Reality Window:

**Assumption → Evidence → Reasoning → Scraper → Verification → Updated Reality**

## The Problem

Real-world information changes constantly.

A statement such as:

> "Short-term rentals are still legal in Houston."

may be true today and become outdated tomorrow.

Traditional search gives you a snapshot. An LLM can explain that snapshot, but neither one gives you a reliable mechanism for continuously checking whether the underlying reality has changed.

Reality Window is designed around that missing workflow.

## How It Works

### 1. Define what to watch

The user provides:

- **Subject** — what should be monitored
- **Assumption** — the claim we want to verify

Example:

```text
Subject:
Houston short-term rental regulations

Assumption:
Short-term rentals are still legal for registered hosts.
```

### 2. Gather evidence

Reality Window generates targeted search queries and uses Bright Data SERP data to discover relevant sources.

Sources are cleaned and classified before they reach the reasoning layer.

### 3. Reason over evidence

The LLM receives only the supplied evidence.

It determines whether the current evidence:

- supports the assumption
- contradicts the assumption
- is mixed / inconclusive
- is insufficient

The reasoning response also identifies the evidence that should be monitored going forward.

### 4. Build a scraper

The evidence requirements are converted into a scraper target.

Bright Data Scraper Studio's AI Flow is used to create a collector from:

- target URL
- extraction instructions

The generated scraper can then be reviewed before production collection.

### 5. Collect structured data

After the scraper is approved, Bright Data Scraper Studio runs the collector and delivers the resulting structured data back to Reality Window through a webhook.

This turns an unstructured web page into application-owned data that can be compared on future runs.

### 6. Detect change

The long-term workflow is:

```text
Detect
  ↓
Diagnose
  ↓
Act
  ↓
Verify
```

A future run does not need to repeat the entire discovery process when an existing scraper can still collect the required evidence.

## Architecture

```text
                    ┌──────────────────────┐
                    │      User / UI        │
                    │ Subject + Assumption  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Watch Planner     │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
        ┌────────────────┐          ┌────────────────┐
        │ Bright Data    │          │ LLM Reasoning  │
        │ SERP / Sources │─────────▶│ Evidence-based │
        └────────────────┘          └───────┬────────┘
                                            │
                                  Evidence requirements
                                            │
                                            ▼
                                  ┌──────────────────┐
                                  │ Scraper Studio   │
                                  │ AI Flow          │
                                  └────────┬─────────┘
                                           │
                                  Collector / Schema
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ Manual Review    │
                                  │ + Approval       │
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ Bright Data      │
                                  │ Collector        │
                                  └────────┬─────────┘
                                           │
                                      Webhook
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ Reality Window   │
                                  │ Persistence      │
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │ Future Watch     │
                                  │ / Change Check   │
                                  └──────────────────┘
```

## Bright Data Integration

Reality Window uses Bright Data for two distinct stages.

### Source discovery

Bright Data SERP is used to discover current web sources relevant to the assumption.

### Structured extraction

Bright Data Scraper Studio is used to turn selected sources into structured, repeatable data.

The Scraper Studio AI Flow supports the collector-generation workflow:

```text
Create collector
      ↓
Trigger AI Flow
      ↓
Poll AI job progress
      ↓
Generated scraper
      ↓
Review / approve
      ↓
Run collector
      ↓
Webhook delivery
      ↓
Persist result
```

## Persistence

Reality Window maintains a watch registry so the same scenario does not unnecessarily recreate its entire pipeline.

A scenario is identified using a deterministic hash of:

```text
subject + assumption
```

The persistence layer tracks:

- watch
- scraper
- collector ID
- AI job ID
- collection ID
- scraper status
- generated schema
- sample data
- latest collected data
- last run
- verification state

This enables multiple watches/scenarios to coexist independently.

## Project Structure

```text
src/
├── brightdata/
│   ├── client.ts
│   ├── serp.ts
│   └── types.ts
├── controllers/
│   ├── scraper.controller.ts
│   └── watch.controller.ts
├── llm/
│   ├── providers/
│   │   ├── deepseek.ts
│   │   ├── gemini.ts
│   │   └── openrouter.ts
│   ├── prompts.ts
│   ├── provider.ts
│   ├── service.ts
│   └── types.ts
├── perisistence/
│   └── client.ts
├── routes/
│   └── watches.ts
├── scraper/
│   ├── service.ts
│   ├── studio.ts
│   └── types.ts
├── watches/
│   ├── planner.ts
│   ├── registry.ts
│   ├── source-classifier.ts
│   ├── source-cleanup.ts
│   └── types.ts
└── server.ts
```

## Current Status

The project is being built incrementally around a real end-to-end workflow.

### Implemented

- Watch creation API
- Search query generation
- Bright Data SERP integration
- Source cleanup / restriction handling
- Evidence-based LLM reasoning
- Evidence requirements generation
- PostgreSQL + Prisma persistence
- Scraper Studio integration foundation
- Bright Data collector creation
- Scraper Studio AI Flow triggering
- AI Flow progress polling
- Webhook delivery configuration
- Webhook-based collection path

### In progress

- Final scraper registry/controller wiring
- Schema review and approval lifecycle
- Collector execution lifecycle
- Collection persistence
- Repeat-watch behavior
- Change detection and verification loop
- Frontend workflow

## Why "Reality Window"?

The name represents the product's core idea:

> A window into what is currently true — backed by evidence rather than a one-time answer.

The system is not trying to be another search engine or another chatbot.

It creates a **window that can be revisited as reality changes**.

## Development Philosophy

Reality Window is intentionally built as a workflow rather than a collection of disconnected AI features.

The goal is to make the system capable of:

```text
Observe → Reason → Extract → Store → Compare → Verify
```

The AI is used where reasoning is valuable.

The scraper is used where repeatable observation is valuable.

The database is used where continuity is valuable.

Together, they create a system that can move beyond:

```text
Detect → Explain
```

toward:

```text
Detect → Diagnose → Act → Verify
```

## Environment

Typical environment variables:

```env
DATABASE_URL=
BRIGHT_DATA_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=
```

For local webhook development, a public HTTPS tunnel such as ngrok can be used to expose the webhook endpoint to Bright Data.

## Running Locally

Install dependencies:

```bash
npm install
```

Generate Prisma client:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Start the API using the project's configured development command.

## Roadmap

- [ ] Complete scraper lifecycle
- [ ] Schema review UI
- [ ] Collector approval
- [ ] Collector execution
- [ ] Webhook ingestion
- [ ] Persist collected datasets
- [ ] Reuse existing collectors
- [ ] Detect meaningful changes
- [ ] Re-run evidence verification
- [ ] Surface changed assumptions to users
- [ ] Complete end-to-end frontend workflow

---

Built for the **Into the Scrape-Verse** hackathon by WeMakeDevs × Bright Data.
