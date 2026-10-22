from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class Prediction(BaseModel):
    ingredient_name: str
    confidence: float = Field(ge=0, le=1)


class DetectedIngredient(BaseModel):
    item_id: int
    ingredient_name: str
    image_url: str | None = None
    confidence: float = Field(ge=0, le=1)
    predictions: list[Prediction] = Field(default_factory=list)  # top 5, best first


class ClassificationResponse(BaseModel):
    predictions: list[Prediction]


class IngredientCount(BaseModel):
    ingredient_name: str
    instance_count: int = Field(ge=1)


class AnalysisResponse(BaseModel):
    items: list[DetectedIngredient]
    ingredients: list[IngredientCount]


class RecipeRequest(BaseModel):
    ingredients: list[IngredientCount] = Field(min_length=1)
    max_missing_ingredients: int
    min_used_ingredients: int
    limit: int


class RecipeIngredient(BaseModel):
    name: str
    amount: float
    unit: str
    original: str
    available: bool


class Recipe(BaseModel):
    recipe_id: str
    title: str
    image_url: str | None = None
    source_url: str | None = None
    ingredients: list[RecipeIngredient]
    instructions: list[str]
    preparation_time_minutes: int | None = None
    servings: int | None = None


class RecipeResponse(BaseModel):
    recipes: list[Recipe]
