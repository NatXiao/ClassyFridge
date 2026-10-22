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
from backend.utils.food_classification import recognize_food_batch
from backend.utils.handle_images import decode_image
from backend.utils.recipes import get_recipe_suggestions


class ServiceNotConfiguredError(RuntimeError):
    """Raised while an existing project function has not yet been connected."""


def analyze_image(image: bytes) -> AnalysisResponse:
    """Segment, crop, classify, aggregate, and return the detected ingredients."""
    # decode the image bytes into a NumPy array
    decoded_image = decode_image(image)

    # segment and crop the images into a list of cropped images
    result, cropped_images = segment_and_crop(
        decoded_image, img_size=1024, confidence=0.8, iou=0.3
    )

    # should never happen, TODO see what we do if this happens
    if len(cropped_images) == 0:
        return AnalysisResponse(items=[], ingredients=[])

    # classify each cropped image

    prediction = recognize_food_batch(cropped_images, batch_size=len(cropped_images), top_k=4)
    detected_ingredients = [
        DetectedIngredient(
            item_id=index,
            ingredient_name=preds[0]["label"],
            confidence=preds[0]["confidence"],
        )
        for index, preds in enumerate(prediction)
    ]
    # detected_ingredients = []
    # for index, crop in enumerate(cropped_images):
    #     top = recognize_food(crop, top_k=4)[0]
    #     detected_ingredients.append(
    #         DetectedIngredient(
    #             item_id=index,
    #             ingredient_name=top["label"],
    #             confidence=top["confidence"],
    #         )
    #     )
    
    # TODO see how we could parallelize this step
    # TODO for mushroom results, use our CNN model to classify edible vs poisonous mushrooms
    # TODO return the result in an AnalysisResponse schema

    # test with only the segmentation and cropping step for now
    # assume all cropped images are mushrooms
    #test_ingredient_names = ['carrot', 'potato', 'tomato', 'onion', 'garlic', 'pepper', 'mushroom'] 
    # detected_ingredients = [
    #     DetectedIngredient(
    #         item_id=index,
    #         ingredient_name=random.choice(test_ingredient_names),
    #         confidence=0.9,
    #     )
    #     for index in range(len(cropped_images))
    # ]

    ingredient_counts = {}
    for ingredient in detected_ingredients:
        ingredient_name = ingredient.ingredient_name
        ingredient_counts[ingredient_name] = (
            ingredient_counts.get(ingredient_name, 0) + 1
        )

    # response
    analysis_response = AnalysisResponse(
        items=detected_ingredients,
        ingredients=[
            IngredientCount(ingredient_name=name, instance_count=count)
            for name, count in ingredient_counts.items()
        ],
    )

    return analysis_response


def suggest_recipes(request: RecipeRequest) -> RecipeResponse:
    """Call the existing recipe API and map its output to the response schema."""
    ingredient_names = list(
        dict.fromkeys(
            ingredient.ingredient_name.strip().lower()
            for ingredient in request.ingredients
        )
    )

    recipes = get_recipe_suggestions(
        ingredient_names,
        max_missing_ingredients=request.max_missing_ingredients,
        min_used_ingredients=request.min_used_ingredients,
        limit=request.limit,
    )

    return RecipeResponse(recipes=recipes)
