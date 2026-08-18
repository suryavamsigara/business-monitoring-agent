import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.database.supabase_client import get_supabase
from app.agent.orchestrator import AgentOrchestrator
from app.repositories.agent_run_repository import AgentRunRepository


def main():
    client = get_supabase()
    run_repo = AgentRunRepository(client)

    # 1. Clean up incomplete test runs
    run_repo.cleanup_abandoned_runs()

    # 2. Run a clean Agent cycle
    print("Executing fresh Agent Run on 100% Supabase...", flush=True)
    orch = AgentOrchestrator(client, trigger="manual")
    res = orch.run()
    print("Agent Run result:", res, flush=True)

    # 3. Verify step execution trace
    run_id = res["run_id"]
    run = run_repo.get(run_id)
    print(f"\n=== VERIFYING SUPABASE AGENT RUN #{run.id} ===", flush=True)
    print(f"Status: {run.status}", flush=True)
    print(f"Anomalies Detected: {run.anomalies_detected}", flush=True)
    print(f"Alerts Created: {run.alerts_created}", flush=True)
    print(f"Total Steps in Trace: {len(run.steps)}", flush=True)
    for s in run.steps:
        print(f"  • [{s.status}] {s.step_name}: {s.output_summary} ({s.duration_ms}ms)", flush=True)


if __name__ == "__main__":
    main()
