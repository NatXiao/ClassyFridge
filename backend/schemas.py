from uuid import UUID

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class DetectedIngredient(BaseModel):
    item_id: UUID
    ingredient_name: str
    confidence: float = Field(ge=0, le=1)


class IngredientCount(BaseModel):
    ingredient_name: str
    instance_count: int = Field(ge=1)


class AnalysisResponse(BaseModel):
    items: list[DetectedIngredient]
    ingredients: list[IngredientCount]


class RecipeRequest(BaseModel):
    ingredients: list[IngredientCount] = Field(min_length=1)
    max_missing_ingredients: int = Field(default=2, ge=0)
    limit: int = Field(default=3, ge=1, le=10)


class Recipe(BaseModel):
    recipe_id: str
    title: str
    required_ingredients: list[str]
    available_ingredients: list[str]
    missing_ingredients: list[str]
    instructions: list[str]
    preparation_time_minutes: int | None = None


class RecipeResponse(BaseModel):
    recipes: list[Recipe]
