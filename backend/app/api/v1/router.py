from fastapi import APIRouter

from app.api.v1.endpoints import analyze, auth, chat, consultations, dataset_analysis, genes, health, reports

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(analyze.router, tags=["analyze"])
api_router.include_router(dataset_analysis.router, tags=["dataset-analysis"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(consultations.router, tags=["consultations"])
api_router.include_router(genes.router, tags=["genes"])
api_router.include_router(reports.router, tags=["reports"])
