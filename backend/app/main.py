import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import (
    auth,
    categories,
    coupons,
    follows,
    pincodes,
    product_categories,
    product_requests,
    products,
    reviews,
    shops,
    uploads,
)

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(title="Hylo Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Local-network origins (e.g. a phone on the same Wi-Fi hitting the dev
    # machine's LAN IP to test the PWA) aren't known ahead of time, so allow
    # any private-range origin — only when running locally, never in prod.
    allow_origin_regex=r"http://(192\.168|10\.\d+|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+:\d+"
    if settings.environment == "local"
    else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router)
app.include_router(shops.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(product_categories.router)
app.include_router(product_requests.router)
app.include_router(coupons.router)
app.include_router(reviews.router)
app.include_router(follows.router)
app.include_router(pincodes.router)
app.include_router(uploads.router)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
