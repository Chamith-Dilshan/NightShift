from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.api import router

app = FastAPI(title="NightShift API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok"}