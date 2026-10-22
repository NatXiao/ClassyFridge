import os

import requests
from dotenv import load_dotenv

from backend.schemas import Recipe, RecipeIngredient

BASE_URL = "https://api.spoonacular.com"
NB_OF_RECIPES = 20
LIMIT_RECIPES = 3
MAX_MISSING_INGREDIENTS = 2
MIN_INGREDIENTS = 2


def get_api_key() -> str:
    load_dotenv()
    api_key = os.getenv("SPOONACULAR")

    if not api_key:
        raise RuntimeError("Spoonacular API key is not set in environment variables.")

    return api_key


# helper to make GET requests
def spoonacular_get(path: str, params: dict | None = None) -> dict | list:
    request_params = dict(params or {})
    request_params["apiKey"] = get_api_key()

    normalized_path = f"/{path.lstrip('/')}"
    response = requests.get(
        f"{BASE_URL}{normalized_path}", params=request_params, timeout=10
    )

    response.raise_for_status()

    return response.json()


# find recipes with the ingredients we have
def find_recipes(
    ingredients: list[str],
    number: int = 10,
) -> list[dict]:
    return spoonacular_get(
        "/recipes/findByIngredients",
        params={
            "ingredients": ",".join(ingredients),
            "number": number,
            "ranking": 2,
            "ignorePantry": True,
        },
    )


# get details about a recipe,
def get_recipe_details(recipe_id: int) -> dict:
    return spoonacular_get(
        f"/recipes/{recipe_id}/information", params={"includeNutrition": False}
    )


# extract instructions from the details
def extract_instructions(recipe_details: dict) -> list[str]:
    instructions = []
    for step in recipe_details.get("analyzedInstructions", []):
        for instruction in step.get("steps", []):
            instructions.append(instruction.get("step", ""))
    return instructions


# build recipe schema from the details and instructions
def build_recipe(
    candidate: dict, recipe_details: dict, instructions: list[str]
) -> Recipe:
    used_ids = {ing.get("id") for ing in candidate.get("usedIngredients", [])}

    return Recipe(
        recipe_id=str(recipe_details.get("id", "")),
        title=recipe_details.get("title", ""),
        image_url=recipe_details.get("image") or candidate.get("image"),
        required_ingredients=[
            ing.get("original") or ing.get("name", "")
            for ing in recipe_details.get("extendedIngredients", [])
        ],
        available_ingredients=[
            ing.get("name", "") for ing in candidate.get("usedIngredients", [])
        ],
        missing_ingredients=[
            ing.get("name", "") for ing in candidate.get("missedIngredients", [])
        ],
        instructions=instructions,
        preparation_time_minutes=recipe_details.get("readyInMinutes"),
        servings=recipe_details.get("servings"),
        ingredients=[
            RecipeIngredient(
                name=ing.get("name", ""),
                amount=ing.get("amount") or 0,
                unit=ing.get("unit", ""),
                original=ing.get("original", ""),
                available=ing.get("id") in used_ids,
            )
            for ing in recipe_details.get("extendedIngredients", [])
        ],
    )


# complete function to get recipe suggestions
def get_recipe_suggestions(
    ingredients: list[str],
    max_missing_ingredients: int = MAX_MISSING_INGREDIENTS,
    limit: int = LIMIT_RECIPES,
) -> list[Recipe]:
    # find recipes with the ingredients we have
    candidate_recipes = find_recipes(ingredients, number=NB_OF_RECIPES)

    # filter recipes based on missing ingredients
    feasible_recipes = [
        recipe
        for recipe in candidate_recipes
        if len(recipe.get("missedIngredients", [])) <= max_missing_ingredients
        and len(recipe.get("usedIngredients", [])) >= MIN_INGREDIENTS
    ]

    # limit the number of recipes returned
    feasible_recipes = feasible_recipes[:limit]

    # get details and instructions for each feasible recipe
    recipe_suggestions = []
    for recipe in feasible_recipes:
        recipe_details = get_recipe_details(recipe["id"])
        instructions = extract_instructions(recipe_details)
        recipe_suggestions.append(
            build_recipe(
                candidate=recipe,
                recipe_details=recipe_details,
                instructions=instructions,
            )
        )

    return recipe_suggestions
