"""FastAPI application main entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.logging import RequestIDMiddleware
from app.api import routes_market, routes_portfolio, routes_risk, routes_stress, routes_backtest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Market Risk Engine API",
    description="End-to-End Market Risk Engine supporting universal instruments",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request ID middleware
app.add_middleware(RequestIDMiddleware)

# Include routers
app.include_router(routes_market.router, prefix="/api")
app.include_router(routes_portfolio.router, prefix="/api")
app.include_router(routes_risk.router, prefix="/api")
app.include_router(routes_stress.router, prefix="/api")
app.include_router(routes_backtest.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Market Risk Engine API",
        "version": "1.0.0",
        "docs": "/docs"
    }

