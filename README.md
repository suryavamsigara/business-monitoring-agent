# Business Pulse Agent

> **Autonomous KPI Monitoring, Deterministic Anomaly Detection, and AI-Driven Investigation Platform for Multi-Channel E-Commerce.**

---

## 1. Executive Summary

Modern e-commerce and retail marketplace operations generate thousands of telemetry observations daily across channels (Amazon, Myntra, Flipkart, Ajio), SKU catalogs, ad spend, and warehouse inventory.

Traditional static dashboards force operations managers to manually scan dozens of charts and guess why performance dropped. The **Business Pulse Agent** transforms operations from reactive monitoring to **autonomous detection and investigation**:
- **Continuously monitors** 8 commercial, customer, and supply-chain KPIs.
- **Applies deterministic anomaly detection** (rolling baselines, z-score statistical models, compound signals) with zero hallucinations.
- **Autonomously executes investigation tools** to isolate root-cause contributors and estimate financial exposure.
- **Generates prioritized, deduplicated business alerts** with actionable operational steps.
- **Provides an interactive Agent Assistant** for conversational deep-dives into detected anomalies and audit trails.

---

## 2. System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer (React 18 + Vite + Tailwind CSS)"]
        UI1["Executive Overview Dashboard"]
        UI2["Incident & Alert Dossier"]
        UI3["KPI Rules Matrix"]
        UI4["Agent Execution Audit Trails"]
        UI5["Interactive Agent Assistant"]
    end

    subgraph API["FastAPI Application Layer"]
        R1["/api/pulse (Summary, Trends)"]
        R2["/api/agent (Run Now, Status, Runs Audit)"]
        R3["/api/alerts (Lifecycle, Investigation)"]
        R4["/api/monitoring (KPI Rules, Configurations)"]
        R5["/api/assistant (Chat, Tool Context)"]
        SCH["Background Scheduler (APScheduler - Every 15m)"]
    end

    subgraph Core["Agent Workflow Engine (Pure Python OOP)"]
        ENG["Analytics Engine (In-Memory Fast Cache)"]
        DET["Deterministic Anomaly Detector"]
        INV["Investigation Service (OOP Tool Registry)"]
        LLM["Structured AI Reasoning / DeepSeek LLM"]
        SCOR["Severity & Financial Impact Scorer"]
        ALR["Alert & Deduplication Service"]
    end

    subgraph Data["Database Layer (Supabase / PostgreSQL)"]
        DB1[("sales_daily")]
        DB2[("inventory")]
        DB3[("products & marketplaces")]
        DB4[("monitoring_rules")]
        DB5[("anomalies & alerts")]
        DB6[("agent_runs & agent_steps")]
    end

    Frontend <-->|REST API / JSON| API
    SCH --> Core
    API --> Core
    Core <-->|Batched REST / SQL| Data
```

---

## 3. Autonomous 6-Stage Execution Lifecycle

Every monitoring cycle (whether triggered automatically by the background scheduler or on-demand via **"Run Agent Now"**) runs through a 6-stage lifecycle:

```mermaid
stateDiagram-v2
    [*] --> Observe: Scheduler (Every 24 hours) / Manual Trigger
    Observe --> Detect: Ingests 30d/60d telemetry across channels & SKUs
    Detect --> Investigate: Evaluates statistical baselines & deterministic rules
    Investigate --> Reason: Executes targeted investigation tools
    Reason --> Prioritize: Synthesizes multi-factor evidence & contributors
    Prioritize --> Alert: Computes severity (0-100) & revenue at risk
    Alert --> [*]: Generates deduplicated alerts with cooldown checks
```

1. **Observe**: Ingests point-in-time and rolling sales, traffic, conversion, returns, and inventory telemetry.
2. **Detect**: Evaluates metrics against historical 30-day moving baselines, statistical z-scores, and compound signals (e.g. *Traffic Steady + Conversion Drop*).
3. **Investigate**: Dispatches OOP investigation tools (`get_product_contributors`, `get_marketplace_performance`, `get_conversion_anomalies`, `estimate_revenue_impact`).
4. **Reason**: Synthesizes multi-factor diagnostics and identifies likely root-cause contributors.
5. **Prioritize**: Scores anomaly severity and calculates monetary exposure (revenue at risk).
6. **Alert**: Creates or updates business incident alerts, enforcing deduplication and alert cooldown rules (120 mins).

---

## 4. Key Features

- **Continuous KPI Health Monitor**: Tracks Revenue, Orders, Conversion Rate, Return Rate, Average Order Value (AOV), Inventory Days, Sales Velocity, and Revenue at Risk.
- **Zero-Hallucination Deterministic Detection**: Threshold breaches and z-score calculations are executed purely in Python math—never hallucinated by LLMs.
- **AI-Powered Diagnostics & Root-Cause Synthesis**: LLMs are used for evidence synthesis, contributor attribution, and operational recommendations.
- **Incident & Alert Dossier**: 100% dynamic incident detail view showing observed vs expected metrics, variance, supply chain buffer status, diagnostics, and prioritized operational action plans.
- **End-to-End Audit Trail**: Every run logs its steps, start/end timestamps, duration in milliseconds, and raw tool payloads.
- **In-Memory Analytical Caching**: Process-level caching with TTL reduces dashboard load latency from **40s to < 1s** across 15,000+ historical rows.
- **Interactive Agent Assistant**: Conversational modal allowing operators to query the agent regarding active alerts, run steps, and telemetry.

---

## 5. Technology Stack

### Backend
- **Python 3.11+**
- **uv**: Ultra-fast Python package and virtual environment manager.
- **FastAPI**: Asynchronous REST API framework.
- **Supabase / PostgreSQL**: Cloud relational database.
- **APScheduler**: In-process background scheduler.
- **Pandas & NumPy**: High-performance analytical aggregations and rolling baselines.
- **Pydantic v2**: Strict schema validation.

### Frontend
- **React 18** (SPA)
- **Vite**: Frontend build tool and development server.
- **Tailwind CSS**: Modern, high-contrast monochrome and slate executive theme.
- **Recharts**: Responsive timeseries and baseline anomaly visualizers.
- **Lucide React**: Modern iconography.
- **React Markdown & Remark GFM**: Markdown rendering for agent responses.

---

## 6. Getting Started

### Prerequisites
- **Node.js 18+** & **npm**
- **uv** (Install via `curl -LsSf https://astral.sh/uv/install.sh` or `brew install uv`)

---

### Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Sync dependencies using `uv`:
   ```bash
   uv sync
   ```

3. Configure your `.env` file:
   ```bash
   cp .env.example .env
   ```
   *Fill in your `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, and `LLM_API_KEY`.*

4. Start the FastAPI backend server:
   ```bash
   uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

### Frontend Setup

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open **`http://localhost:5173`** in your browser.

---

## 7. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pulse/summary` | Snapshot of business KPIs, growth percentages, and alert counters |
| `GET` | `/api/pulse/trend?days=30` | 30-day historical revenue telemetry timeseries |
| `GET` | `/api/monitoring/kpis` | Monitored KPI health statuses and threshold boundaries |
| `GET` | `/api/monitoring/rules` | Configurable deterministic monitoring rules matrix |
| `PATCH` | `/api/monitoring/rules/{id}` | Update rule threshold values, severity, or toggle ON/OFF |
| `GET` | `/api/alerts` | Filterable list of business alerts (by severity, status, channel) |
| `GET` | `/api/alerts/{id}` | Full incident dossier with evidence, diagnostics, and action plan |
| `PATCH` | `/api/alerts/{id}/status` | Update alert lifecycle state (`New`, `Investigating`, `Acknowledged`, `Resolved`, `Dismissed`) |
| `GET` | `/api/agent/status` | Current scheduler state, interval, and next run timestamp |
| `POST` | `/api/agent/run` | Triggers an immediate full 6-stage autonomous monitoring cycle |
| `GET` | `/api/agent/runs` | Execution history of all past agent cycles |
| `GET` | `/api/agent/runs/{id}` | Step-by-step audit trace with tool calls and duration metadata |
| `POST` | `/api/assistant/chat` | Interactive agent assistant conversation endpoint |

---

## 8. Database Schema Overview

```mermaid
erDiagram
    products ||--o{ sales_daily : "records"
    marketplaces ||--o{ sales_daily : "records"
    products ||--o{ inventory : "stock levels"
    monitoring_rules ||--o{ anomalies : "triggers"
    agent_runs ||--o{ agent_steps : "contains"
    anomalies ||--o{ alerts : "generates"
    agent_runs ||--o{ alerts : "associates"

    products {
        int id PK
        string name
        string category
        float price
        float cost
        string sku
    }

    sales_daily {
        date date PK
        int product_id FK
        int marketplace_id FK
        int impressions
        int clicks
        int visits
        int orders
        int units_sold
        float revenue
        int returns
        float ad_spend
    }

    inventory {
        int id PK
        date date
        int product_id FK
        int stock
        int incoming_po
    }

    monitoring_rules {
        int id PK
        string kpi_name
        boolean enabled
        string threshold_type
        float threshold_value
        string severity
        int cooldown_minutes
    }

    anomalies {
        int id PK
        string kpi_name
        float actual_value
        float expected_value
        float deviation_pct
        string severity
        string detection_method
        timestamp detected_at
    }

    alerts {
        int id PK
        int anomaly_id FK
        int run_id FK
        string title
        string severity
        string status
        float actual_value
        float expected_value
        float estimated_impact
        string summary
        json evidence
        json recommendations
        int occurrence_count
    }

    agent_runs {
        int id PK
        timestamp started_at
        timestamp completed_at
        string status
        string trigger
        int kpis_checked
        int anomalies_detected
        int alerts_created
    }
```