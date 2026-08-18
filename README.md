# Business Pulse Agent
> **Autonomous KPI Monitoring, Multi-Method Anomaly Detection, and AI-Driven Investigation Platform for E-Commerce Operations.**

---

## 1. Problem Statement

Modern e-commerce and multi-channel marketplace operations generate hundreds of thousands of telemetry data points daily across channels (Amazon, Myntra, Flipkart, Ajio), product catalogs, marketing ad spend, return logistics, and warehouse inventory.

Traditional dashboards force operations managers to manually review charts and guess why metrics drop. By the time a 17% revenue decline or stock-out risk is manually noticed, days of sales velocity and search ranking are permanently lost.

---

## 2. The Solution: Autonomous Business Pulse Agent

The **Business Pulse Agent** is a system-driven, continuous monitoring and investigation platform that:
1. **Continuously Observes** real commercial, inventory, and customer telemetry across all channels and SKUs.
2. **Runs Deterministic Anomaly Detection** (z-score statistical models, rolling baselines, relative WoW shifts, and compound signal combinations) with zero LLM hallucinations in threshold detection.
3. **Autonomously Investigates** meaningful breaches using a clean OOP tool registry (`get_product_contributors`, `get_marketplace_performance`, `estimate_revenue_impact`, `get_conversion_anomalies`).
4. **Synthesizes Multi-Factor Evidence & Root-Causes** with structured AI reasoning or deterministic fallback.
5. **Prioritizes Severity & Potential Revenue Exposure** via an interpretable heuristic formula (0–100 score).
6. **Proactively Generates Deduplicated Alerts & Prescriptive Recommendations** with configurable cooldowns (e.g. 120 minutes) to eliminate alert fatigue.
7. **Empowers Operators via Agent Assistant** — a contextual conversational interface to ask questions about detected anomalies, tool evidence, and prioritized next steps.

```
                      OBSERVE
            (KPI & Telemetry Ingestion)
                         ↓
                       DETECT
           (Deterministic Anomaly Engine)
                         ↓
                    INVESTIGATE
          (OOP Agent Tool Registry Execution)
                         ↓
                       REASON
         (Multi-Signal Evidence Synthesis)
                         ↓
                     PRIORITIZE
        (Severity Scoring & Revenue Exposure)
                         ↓
                       ALERT
      (Deduplicated Alert Lifecycle & Cooldown)
```

---

## 3. Relationship to Part 1

| Aspect | Part 1: Marketplace Copilot | Part 2: Business Pulse Agent |
| :--- | :--- | :--- |
| **Paradigm** | **User-driven** ("Pull") | **System-driven** ("Push" / Autonomous) |
| **Primary Interaction** | Conversational Chat & Drill-downs | Live Control Center, Alerts, Timelines, & Audit Trails |
| **Execution Trigger** | User prompts & queries | Autonomous Scheduler (APScheduler) & Live Telemetry |
| **Investigation** | Ad-hoc user inquiry | Proactive tool-based root-cause hypothesis generation |
| **Agent Assistant** | General analytics copilot | Contextual diagnostics for agent detections & alerts |

---

## 4. Key Features & Capabilities

- **Autonomous Background Scheduler**: APScheduler runs every 15 minutes to evaluate business telemetry and trigger proactive alerts.
- **Multi-Method Deterministic Anomaly Detection**:
  - *Threshold Breach*: Metric falls outside defined boundary (e.g. Revenue < Expected × 0.90).
  - *Rolling Historical Baseline*: 30-day moving average deviation tracking.
  - *Statistical Anomaly (Z-Score)*: Flags anomalies with $|z| > 2.0$.
  - *Compound Business Signals*: Detects multi-factor shifts (e.g., Traffic Stable + Conversion Down 35% + Orders Down).
  - *Supply Chain Thresholds*: Flags stock-out risks (< 14 days coverage) and excess inventory lockups.
- **Deduplication & Cooldown Engine**: Enforces strict dedup keys and configurable cooldown windows (120 mins) unless severity worsens.
- **Full 6-Step Audit Trail**: Complete transparency into every agent execution step with duration, timestamps, input/output summaries, and raw tool payloads.
- **Interactive Recharts Visualizer**: Actual vs Expected baseline curves over 30 days with custom dark glass tooltips.
- **Agent Assistant Modal**: Lightweight conversational interface to interrogate the agent regarding its findings.
- **Live Demo Sandbox**: One-click evaluator controls to simulate real-world scenarios (Amazon Revenue Drop, EcoRunner Conversion Decline, Runner Pro Stock-Out Risk, Heritage Loafer Return Spike, CoastalWalk Excess Inventory).

---

## 5. Technology Stack

### Backend
- **Python 3.11+**
- **FastAPI**: REST API endpoints for agent orchestration, alert lifecycle, and telemetry.
- **SQLAlchemy & PostgreSQL / SQLite**: Database ORM and persistent storage.
- **Supabase**: Cloud PostgreSQL database integration with row-level security and credentials isolation.
- **Pydantic v2**: Strict schema validation for agent states and structured AI outputs.
- **APScheduler**: In-process background scheduler for autonomous monitoring cycles.
- **Pandas & NumPy**: Fast analytical aggregations and rolling baseline calculations.

### Frontend
- **React.js (JavaScript)**: Fast, modular, single-page application.
- **Vite**: Ultra-fast build tool and dev server with proxy routing.
- **Tailwind CSS**: Sleek dark-mode control center aesthetic with customized glassmorphism and glowing telemetry badges.
- **Recharts**: Responsive timeseries charts with baseline reference lines and custom tooltips.
- **Lucide React**: Modern iconography for signals, tools, and severity states.
- **Canvas Confetti**: Visual celebration on alert resolution and cycle completion.

---

## 6. Architecture Diagram

```
                 React 18 UI (Vite + Tailwind)
                              │
                    REST API (/api/*)
                              │
                    FastAPI Application
                              │
                    Agent Orchestrator
             (Pure Python Custom Workflow Engine)
                              │
      ┌───────────────────────┼────────────────────────┐
      ↓                       ↓                        ↓
Analytics Engine       Anomaly Detector         Agent Tool Registry
(Calculates KPIs)    (Deterministic Rules)     (OOP Investigation Tools)
      │                       │                        │
      └───────────────────────┼────────────────────────┘
                              │
               Supabase / PostgreSQL Database
             (Products, Sales, Inventory, Alerts)
                              │
                   Agent Assistant & AI Layer
                (Structured Reasoning & Fallback)
```

---

## 7. Database Schema

- `products`: SKU, product name, footwear category, selling price, unit cost, launch date.
- `marketplaces`: Amazon, Myntra, Flipkart, Ajio.
- `sales_daily`: 90-day daily observations of impressions, clicks, visits, orders, units sold, revenue, returns, ad spend.
- `inventory`: Daily inventory snapshot, stock units, incoming purchase orders.
- `competitor_prices`: Weekly competitor benchmark pricing (average & minimum market price).
- `monitoring_rules`: Rule ID, KPI name, enabled flag, threshold type, threshold value, severity, cooldown minutes.
- `anomalies`: Anomaly ID, KPI name, detection method, actual value, expected value, deviation %, score, severity, status.
- `agent_runs`: Run ID, started at, completed at, trigger type, KPIs checked, anomalies detected, alerts created, status.
- `agent_steps`: Step ID, run ID, step name (Observe, Detect, Investigate, Reason, Prioritize, Alert), duration ms, output summary, metadata.
- `alerts`: Alert ID, anomaly ID, title, severity, summary, evidence (JSONB), contributors (JSONB), recommendations (JSONB), confidence, status, occurrence count, dedup key.

---

## 8. Setup & Running Locally

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+

### Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Seed the database with 90-day synthetic business telemetry
python scripts/seed_database.py

# Start FastAPI backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 9. Demo Walkthrough Scenarios

1. **Agent Overview**: Observe the live Agent Active beacon, 8 monitored KPI health cards, 30-day revenue telemetry, and the live activity timeline.
2. **Execute Cycle**: Click **"Run Agent Now"** and watch the real-time 6-stage execution progress.
3. **Investigate Alert**: Navigate to **Business Alerts** or click an alert card (e.g. *Amazon Revenue Anomaly*).
4. **Deep-Dive Anomaly**: Inspect the 30-day actual vs expected Recharts chart, autonomous evidence points, ranked contributors, and prescriptive recommendations.
5. **Interactive Assistant**: Click **"Ask Agent"** and select *"Why was this alert classified as Critical?"* to view conversational diagnostics.
6. **Audit Execution Trail**: Navigate to **Agent Runs & Audit**, open Run `#1`, and inspect the duration and JSON payload of every step.
7. **Simulate Live Anomalies**: Click **"Demo Sandbox"**, choose *Runner Pro Stock-Out Risk*, and click *Simulate Event & Detect* to watch the agent immediately flag the inventory breach.
