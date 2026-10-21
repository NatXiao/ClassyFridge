"""Integration points for the project's existing ML and recipe functions.

Connect the real implementations in this file. Keeping these calls outside the
routes prevents the HTTP layer from depending on a specific model or API.
"""

from backend.schemas import (
    AnalysisResponse,
    DetectedIngredient,
    IngredientCount,
    RecipeRequest,
    RecipeResponse,
)
from backend.utils.fastSam import segment_and_crop
from backend.utils.handle_images import decode_image
from backend.utils.recipes import get_recipe_suggestions


class ServiceNotConfiguredError(RuntimeError):
    """Raised while an existing project function has not yet been connected."""


def analyze_image(
    image: bytes
) -> AnalysisResponse:
    """Segment, crop, classify, aggregate, and return the detected ingredients."""
    # decode the image bytes into a NumPy array
    decoded_image = decode_image(image)

    # segment and crop the images into a list of cropped images
    result, cropped_images = segment_and_crop(
        decoded_image, img_size=1024, confidence=0.8, iou=0.5
    )

    # should never happen, TODO see what we do if this happens
    if len(cropped_images) == 0:
        return AnalysisResponse(items=[], ingredients=[])

    # TODO classify each cropped image
    # TODO see how we could parallelize this step
    # TODO for mushroom results, use our CNN model to classify edible vs poisonous mushrooms
    # TODO return the result in an AnalysisResponse schema

    # test with only the segmentation and cropping step for now
    # assume all cropped images are mushrooms
    detected_ingredients = [
        DetectedIngredient(
            item_id=index,
            ingredient_name="mushroom",
            confidence=0.9,
        )
        for index in range(len(cropped_images))
    ]

    ingredient_count = IngredientCount(
        ingredient_name="mushroom",
        instance_count=len(cropped_images),
    )

    # response  
    analysis_response = AnalysisResponse(
        items=detected_ingredients,
        ingredients=[ingredient_count],
    )

    return analysis_response


def suggest_recipes(request: RecipeRequest) -> RecipeResponse:
    """Call the existing recipe API and map its output to the response schema."""
    ingredient_names = list(
        dict.fromkeys(
            ingredient.ingredient_name.strip().lower() for ingredient in request.ingredients
        )
    )

    recipes = get_recipe_suggestions(
        ingredient_names
    )

    return RecipeResponse(recipes=recipes)
