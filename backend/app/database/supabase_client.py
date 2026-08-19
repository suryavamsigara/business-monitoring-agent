import os
import threading
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client, ClientOptions

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / ".env", override=True)

_client_lock = threading.Lock()
_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is not None:
        return _client

    with _client_lock:
        if _client is None:
            load_dotenv(BACKEND_DIR / ".env", override=True)
            url = (os.getenv("SUPABASE_URL") or "").strip().strip("'\"")
            anon_key = (os.getenv("SUPABASE_KEY") or "").strip().strip("'\"")
            service_key = (os.getenv("SUPABASE_SERVICE_KEY") or "").strip().strip("'\"")

            key = anon_key or service_key
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY/SUPABASE_SERVICE_KEY must be set in .env")

            options = ClientOptions(
                postgrest_client_timeout=30,
                storage_client_timeout=30,
                schema="public",
            )
            _client = create_client(url, key, options=options)

    return _client


def reset_supabase_client():
    global _client
    with _client_lock:
        _client = None
