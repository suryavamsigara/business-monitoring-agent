import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip() or "sqlite:///./business_pulse.db"

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "").strip()
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()

    ALLOWED_ORIGINS: list = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
    ]

    AGENT_INTERVAL_MINUTES: int = int(os.getenv("AGENT_INTERVAL_MINUTES", "15"))
    ALERT_COOLDOWN_MINUTES: int = int(os.getenv("ALERT_COOLDOWN_MINUTES", "120"))


settings = Settings()