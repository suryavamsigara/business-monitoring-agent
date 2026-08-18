import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    # Automatically read LLM API key from LLM_API_KEY, DEEPSEEK_API_KEY, or OPENAI_API_KEY
    LLM_API_KEY: str = (
        os.getenv("LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
    ).strip()

    _raw_model = os.getenv("LLM_MODEL", "deepseek-v4-flash").strip()
    LLM_MODEL: str = "deepseek-v4-flash" if "deepseek" in _raw_model.lower() else _raw_model

    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "").strip() or (
        "https://api.deepseek.com" if ("deepseek" in LLM_MODEL.lower() or os.getenv("DEEPSEEK_API_KEY")) else "https://api.openai.com/v1"
    )

    ALLOWED_ORIGINS: list = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()
    ]

    AGENT_INTERVAL_MINUTES: int = int(os.getenv("AGENT_INTERVAL_MINUTES", "15"))
    ALERT_COOLDOWN_MINUTES: int = int(os.getenv("ALERT_COOLDOWN_MINUTES", "120"))


settings = Settings()