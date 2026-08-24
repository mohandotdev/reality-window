# Reality Window

### Turn assumptions into continuously verified facts.

Reality Window watches the web for things you believe to be true.

You give it:
- a subject
- an assumption
- the evidence that would prove the assumption has changed

Reality Window discovers the relevant web source, builds a purpose-specific scraper, collects fresh evidence, and uses an LLM to determine whether reality still matches your assumption.

> You define what you believe.
> Reality Window watches whether it remains true.

Built for the **Into the Scrape-Verse** hackathon by WeMakeDevs × Bright Data.

---

## The Problem

The web changes constantly.

Policies change. Prices change. Regulations change. Products disappear. Companies change requirements. Documentation gets updated.

But most monitoring systems still make you define:

> "Tell me when this page changes."

That isn't the question people actually care about.

The real question is:

> **"Is what I believe still true?"**

Reality Window turns that question into a monitoring workflow.

---

## The Idea

Reality Window treats monitoring as an **assumption → evidence → reasoning** problem.

Instead of simply detecting that a webpage changed, the system asks whether the new evidence changes the meaning of something the user cares about.

```text
YOUR ASSUMPTION
      │
      ▼
  FIND EVIDENCE
      │
      ▼
 BUILD SCRAPER
      │
      ▼
 COLLECT FRESH DATA
      │
      ▼
  LLM EVALUATION
      │
      ├───────────────┐
      ▼               ▼
 STILL TRUE       CHANGED
      │               │
      ▼               ▼
 No action        FINDING
```

The scraper is the acquisition mechanism.

**The product is the reasoning loop.**

---

## Example

### Question

> "Are Houston's short-term rental requirements still the same?"

### Watch

**Subject**

Houston short-term rental regulations

**Assumption**

Short-term rentals remain legal for registered hosts in Houston.

**Evidence requirements**

- Changes to the legality or registration requirements of short-term rentals in Houston.
- Changes to the $275 annual registration fee or other financial obligations for hosts.
- Adjustments to the platform compliance timeline, including the January 1, 2027 delisting deadline.
- Court rulings or local legislative changes that alter enforcement of the short-term rental ordinance.

### What Reality Window does

1. Creates a purpose-specific Bright Data Scraper Studio collector.
2. Tracks the AI Flow job until the collector is ready.
3. Runs the collector asynchronously.
4. Receives structured results through a Bright Data webhook.
5. Persists the latest observation.
6. Sends the observation through the LLM reasoning layer.
7. Produces a structured evaluation of whether the assumption remains supported.

The important distinction:

> Reality Window does not stop at "the page changed."

It asks:

> **"Does the new evidence change what I believe to be true?"**

---

## Why Bright Data Scraper Studio?

Reality Window does not rely on a hardcoded scraper for every website.

When a watch is created, Bright Data Scraper Studio's AI Flow is used to create a collector tailored to the target source.

The resulting collector can then be executed repeatedly to obtain fresh structured data.

```text
User assumption
      │
      ▼
Relevant source
      │
      ▼
Bright Data Scraper Studio AI Flow
      │
      ▼
Purpose-built collector
      │
      ▼
Fresh structured evidence
      │
      ▼
Reality Window evaluation
```

Bright Data is therefore part of the actual application workflow, not a cosmetic integration.

---

## What Is Implemented

The current MVP establishes the complete acquisition and reasoning foundation.

### Watch

A watch represents:
- subject
- assumption
- target source
- evidence requirements

### Scraper lifecycle

Reality Window currently supports:
1. AI Flow scraper creation
2. AI Flow progress tracking
3. collector persistence
4. scraper state transitions
5. collector execution
6. asynchronous collection
7. Bright Data webhook ingestion
8. latest collection result persistence
9. LLM reasoning
10. evaluation persistence

### Evaluation

Fresh scraper output is passed to the reasoning layer to determine whether the observed evidence is consistent with the user's assumption.

The result is represented as structured application data rather than displaying raw model output directly.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                      Reality Window                      │
│                                                          │
│  Frontend                                                │
│     │                                                    │
│     ▼                                                    │
│  Watch API                                               │
│     │                                                    │
│     ├──────────────► Watch / Scraper State               │
│     │                       │                            │
│     │                       ▼                            │
│     │              Bright Data Scraper Studio            │
│     │                       │                            │
│     │                       ▼                            │
│     │                  Collector                         │
│     │                       │                            │
│     │                       ▼                            │
│     │              Async Collection                      │
│     │                       │                            │
│     │                       ▼                            │
│     │              Bright Data Webhook                   │
│     │                       │                            │
│     │                       ▼                            │
│     │                  Latest Data                       │
│     │                       │                            │
│     │                       ▼                            │
│     └──────────────► LLM Evaluation                      │
│                             │                            │
│                             ▼                            │
│                         Evaluation                       │
└──────────────────────────────────────────────────────────┘

                         │
                         ▼
                    PostgreSQL
```

### End-to-end flow

```text
Create Watch
    ↓
Create AI Scraper
    ↓
Poll AI Flow Progress
    ↓
Collector Ready
    ↓
Run Collector
    ↓
Collection ID
    ↓
Bright Data executes asynchronously
    ↓
Webhook delivers structured result
    ↓
Persist latestData
    ↓
Evaluate latest observation
    ↓
Persist evaluation
```

---

## Engineering Decisions

### Collector lifecycle is persisted

The scraper is not treated as a single API request.

Reality Window persists the state needed to represent asynchronous Bright Data operations, including:
- collector ID
- AI job ID
- collection ID
- scraper status
- latest collected data
- evaluation state

This allows the application to recover the state of a scraper independently from an individual HTTP request.

### Webhook-driven collection

Collection is asynchronous.

Reality Window triggers the collector and receives the resulting structured data through a webhook rather than blocking the run request until the collection finishes.

The run endpoint therefore returns a collection ID and transitions the scraper into a running state.

### State transitions are explicit

Scraper execution is guarded against invalid lifecycle transitions.

For example, a completed scraper cannot simply be executed again without moving through the intended application lifecycle.

### Webhook processing is designed for repeated delivery

Bright Data collection results arrive asynchronously, so webhook handling needs to tolerate repeated delivery.

The application treats collection identity and persisted scraper state as durable application state rather than assuming every webhook is unique.

### Structured LLM output

LLM reasoning is represented as typed application data.

The UI can therefore display a decision, reasoning, evidence, and changed fields independently instead of rendering an opaque model response.

---

## Judge Demo

### 3-minute path

The strongest demo is one complete watch rather than a tour of every feature.

1. Open Reality Window.
2. Create a watch around a real-world assumption.
3. Show the assumption and evidence requirements.
4. Create the scraper through Bright Data Scraper Studio AI Flow.
5. Show the scraper progressing to completion.
6. Run the generated collector.
7. Show the collection ID returned by Bright Data.
8. Show the Bright Data webhook delivering structured article data.
9. Show the latest observation stored by Reality Window.
10. Run the evaluation.
11. Show the resulting reasoning and evidence.
12. Explain how the same watch can be evaluated again when new evidence arrives.

### What the judge should understand

By the end of the demo, the judge should be able to answer:

> **"What happens if the world changes?"**

Reality Window has a concrete answer:

```text
New evidence
    ↓
Fresh collection
    ↓
Evaluation
    ↓
Does reality still support the assumption?
```

---

## API Surface

The MVP exposes the following application capabilities.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/watches/:id` | Retrieve watch and scraper state |
| `GET` | `/api/watches/:id/scraper/progress` | Retrieve Bright Data AI Flow progress |
| `POST` | `/api/watches/:id/scraper/run` | Trigger the collector |
| `POST` | `/api/watches/:id/evaluate` | Evaluate the latest observation |
| `GET` | `/api/watches/:id/evaluations` | Retrieve evaluation history |
| `POST` | Bright Data webhook route | Receive asynchronous collection results |

> The exact route prefix and webhook path are defined by the backend implementation and deployment configuration.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React / TypeScript |
| Backend | Node.js / TypeScript |
| API | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Web extraction | Bright Data Scraper Studio |
| AI reasoning | LLM |
| Async ingestion | Bright Data Webhooks |

---

## Repository Structure

```text
reality-window/
├── backend/
│   └── src/
│       ├── watches/        # Watch lifecycle and planning
│       ├── scraper/        # Bright Data integration + scraper lifecycle
│       ├── evaluation/     # Evidence evaluation
│       ├── llm/            # LLM providers, prompts and reasoning
│       └── controllers/    # HTTP controllers
│
├── frontend/               # Product UI
│
└── README.md
```

---

## Local Development

### Prerequisites

- Node.js
- npm
- PostgreSQL
- Bright Data account and API key
- LLM provider credentials

### Environment

Create the backend environment file using the variables expected by the application.

```bash
cd backend
npm install
```

Configure the required database, Bright Data, webhook and LLM credentials locally.

**Never commit secrets or API keys.**

### Database

Run the Prisma/database setup used by the project.

```bash
npx prisma generate
npx prisma migrate dev
```

### Type checking

Before committing backend changes:

```bash
npx tsc --noEmit
```

### Backend

Start the backend using the project's configured development command.

```bash
npm run dev
```

### Frontend

Start the frontend using its configured development command.

```bash
cd frontend
npm install
npm run dev
```

---

## Testing the Bright Data Flow

A useful backend verification sequence is:

```text
1. Create a watch
2. Create its AI Flow scraper
3. Poll scraper progress
4. Confirm collector is ready
5. Run the collector
6. Capture collectionId
7. Wait for Bright Data webhook
8. Confirm latestData is persisted
9. Run evaluation
10. Confirm evaluation is persisted
```

The important integration boundary is:

```text
Reality Window
       │
       │ create / progress / trigger
       ▼
Bright Data Scraper Studio
       │
       │ asynchronous collection
       ▼
Bright Data Webhook
       │
       ▼
Reality Window
       │
       ├── latestData
       │
       └── evaluation
```

---

## Current MVP Boundary

Reality Window intentionally focuses on one complete workflow:

> **Assumption → Acquisition → Observation → Evaluation**

The current product is not trying to be a generic web monitoring platform.

The MVP proves that a user can express something they believe, obtain fresh structured evidence from the web, and have that evidence evaluated against the original assumption.

That is the core loop.

---

## What's Next

The next iteration can extend the existing foundation with:

- scheduled re-evaluation
- baseline establishment on the first run
- comparison against previous evaluations
- explicit `Finding` objects
- change detection
- notifications when an assumption becomes unsupported
- historical watch timeline
- richer frontend evidence views

These are intentionally separated from the current MVP so that the shipped system remains easy to understand and demonstrate.

---

## Product Philosophy

Reality Window is built around a simple idea:

> **Don't make people continuously check the web. Make the system check whether what matters to them is still true.**

A webpage can change without changing the answer.

A tiny textual change can completely change the answer.

That is why Reality Window combines:

**web extraction + structured evidence + LLM reasoning**

rather than treating page-change detection as the final product.

---

## Hackathon

**Challenge:** Into the Scrape-Verse  
**Organized by:** WeMakeDevs × Bright Data  
**Theme:** Self-healing web scrapers

Reality Window uses Bright Data Scraper Studio as the acquisition layer for purpose-built web collectors and combines the resulting evidence with an application-level reasoning loop.

---

## License

Add the project's chosen license here before public release.
