from backend.utils import recipes


def test_find_recipes_uses_the_correct_spoonacular_url(monkeypatch) -> None:
    requested = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            pass

        def json(self) -> list:
            return []

    def fake_get(url: str, params: dict, timeout: int) -> FakeResponse:
        requested["url"] = url
        requested["params"] = params
        requested["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setenv("SPOONACULAR", "test-key")
    monkeypatch.setattr(recipes.requests, "get", fake_get)

    recipes.find_recipes(["mushroom", "carrot"])

    assert requested["url"] == (
        "https://api.spoonacular.com/recipes/findByIngredients"
    )
    assert requested["params"]["ingredients"] == "mushroom,carrot"
    assert requested["params"]["apiKey"] == "test-key"


def test_build_recipe_includes_image_and_candidate_ingredients() -> None:
    recipe = recipes.build_recipe(
        candidate={
            "image": "https://example.com/search-image.jpg",
            "usedIngredients": [{"name": "mushroom"}],
            "missedIngredients": [{"name": "onion"}],
        },
        recipe_details={
            "id": 42,
            "title": "Mushroom soup",
            "image": "https://example.com/recipe-image.jpg",
            "extendedIngredients": [
                {"name": "mushroom", "original": "200 g mushrooms"}
            ],
            "readyInMinutes": 30,
        },
        instructions=["Cook the mushrooms."],
    )

    assert recipe.image_url == "https://example.com/recipe-image.jpg"
    assert recipe.available_ingredients == ["mushroom"]
    assert recipe.missing_ingredients == ["onion"]
    assert recipe.required_ingredients == ["200 g mushrooms"]
