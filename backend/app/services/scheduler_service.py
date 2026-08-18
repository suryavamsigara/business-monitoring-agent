"""
SchedulerService: wraps APScheduler to run the monitoring cycle on a fixed
interval using the Supabase client.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.config.settings import settings
from app.database.supabase_client import get_supabase
from app.agent.orchestrator import AgentOrchestrator

logger = logging.getLogger("business_pulse.scheduler")


class SchedulerService:
    def __init__(self, interval_minutes: int = None):
        self.interval_minutes = interval_minutes or settings.AGENT_INTERVAL_MINUTES
        self._scheduler = BackgroundScheduler()
        self._job = None

    def start(self):
        if self._scheduler.running:
            return
        self._job = self._scheduler.add_job(
            self.run_monitoring_cycle, "interval", minutes=self.interval_minutes,
            id="business_pulse_monitoring_cycle", replace_existing=True,
        )
        self._scheduler.start()
        logger.info("Scheduler started: monitoring cycle every %s minutes", self.interval_minutes)

    def stop(self):
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            logger.info("Scheduler stopped")

    def next_run_time(self):
        if self._job:
            return self._job.next_run_time
        return None

    def is_active(self) -> bool:
        return self._scheduler.running

    @staticmethod
    def run_monitoring_cycle():
        try:
            client = get_supabase()
            orchestrator = AgentOrchestrator(client, trigger="scheduled")
            result = orchestrator.run()
            logger.info("Scheduled monitoring cycle complete: %s", result)
        except Exception:
            logger.exception("Scheduled monitoring cycle failed")


scheduler_service = SchedulerService()