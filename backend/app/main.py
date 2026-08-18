import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.api import agent, alerts, monitoring, dashboard, assistant
from app.services.scheduler_service import scheduler_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_service.start()
    yield
    scheduler_service.stop()


app = FastAPI(
    title="Business Pulse Agent API",
    description="Autonomous KPI monitoring, anomaly detection, and AI investigation for marketplace operations.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)
app.include_router(alerts.router)
app.include_router(monitoring.router)
app.include_router(dashboard.router)
app.include_router(assistant.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Business Pulse Agent API"}


@app.get("/health")
def health():
    return {"status": "healthy", "scheduler_active": scheduler_service.is_active()}