import time
import logging

logger = logging.getLogger("business_pulse.db")


def execute_with_retry(query, max_retries: int = 3):
    """Executes a PostgREST query with exponential backoff on transient network drops or timeouts."""
    for attempt in range(max_retries):
        try:
            return query.execute()
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error("Database query failed after %d retries: %s", max_retries, e)
                raise
            logger.warning("Database query transient retry (%d/%d): %s", attempt + 1, max_retries, e)
            time.sleep(0.25 * (attempt + 1))
