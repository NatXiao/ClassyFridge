from fastapi import APIRouter, File, HTTPException, UploadFile

from backend import services
from backend.schemas import (
    AnalysisResponse,
    HealthResponse,
    RecipeRequest,
    RecipeResponse,
)

router = APIRouter(prefix="/api/v1")


async def _read_image(image: UploadFile) -> bytes:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload must be an image.")
    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    return content


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse()


@router.post(
    "/analyses",
    response_model=AnalysisResponse,
    tags=["analyses"],
)
async def create_analysis(
    image: UploadFile = File(...),
) -> AnalysisResponse:
    content = await _read_image(image)
    return services.analyze_image(
        content,
    )


@router.post(
    "/recipes/suggestions",
    response_model=RecipeResponse,
    tags=["recipes"],
)
def recipe_suggestions(request: RecipeRequest) -> RecipeResponse:
    return services.suggest_recipes(request)
