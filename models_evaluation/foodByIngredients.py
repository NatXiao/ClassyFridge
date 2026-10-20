import os

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ["SPOONACULAR"]


def find_recipes(ingredients: list[str], number: int = 10) -> list[dict]:
    r = requests.get(
        "https://api.spoonacular.com/recipes/findByIngredients",
        headers={"x-api-key": API_KEY},
        params={"ingredients": ",".join(ingredients), "number": number, "ranking": 2},
    )
    r.raise_for_status()
    return r.json()


stock = {"egg": (2, ""), "tomato": (5, ""), "cheddar": (100, "g")}

COUNT_UNITS = {
    "",
    "large",
    "extra large",
    "medium",
    "small",
    "whole",
    "serving",
    "servings",
    "piece",
    "pieces",
}
GENERIC_TO_GRAMS = {
    "g": 1,
    "gram": 1,
    "grams": 1,
    "kg": 1000,
    "oz": 28.35,
    "ounce": 28.35,
    "ounces": 28.35,
    "lb": 453.6,
    "lbs": 453.6,
    "pound": 453.6,
    "pounds": 453.6,
}
TO_GRAMS = {
    ("cheddar", "cup"): 113,  # râpé
    ("cheddar", "slice"): 21,
    ("cheddar", "slices"): 21,
    ("cheddar", "oz"): 28,
}


def norm_unit(u: str) -> str:
    u = u.lower().strip()
    return "" if u in COUNT_UNITS else u


def to_grams(name: str, amount: float, unit: str) -> float | None:
    """Convertit en grammes si possible, sinon None."""
    unit = unit.lower().strip()
    # "large slices" → "slices" : on garde le dernier mot
    last = unit.split()[-1] if unit else unit
    for u in (unit, last):
        if u in GENERIC_TO_GRAMS:
            return amount * GENERIC_TO_GRAMS[u]
        if (name, u) in TO_GRAMS:
            return amount * TO_GRAMS[(name, u)]
    return None


def check_quantities(recipe: dict, stock: dict) -> list[str]:
    problems = []
    for ing in recipe["usedIngredients"]:
        name = next((k for k in stock if k in ing["name"].lower()), None)
        if name is None:
            continue
        have, have_unit = stock[name]
        need, need_unit = ing["amount"], ing["unit"]

        if norm_unit(need_unit) != norm_unit(have_unit):
            # unités différentes : on tente de tout ramener en grammes
            need_g = to_grams(name, need, need_unit)
            have_g = to_grams(name, have, have_unit)
            if need_g is None or have_g is None:
                problems.append(
                    f"{ing['name']} : {need:g} {need_unit} requis (à vérifier)"
                )
                continue
            need, have, need_unit = need_g, have_g, "g"

        if need > have:
            problems.append(
                f"{ing['name']} : {need:g} {norm_unit(need_unit)} requis, {have:g} dispo".replace(
                    "  ", " "
                )
            )
    return problems


def get_recipe_details(recipe_id: int) -> dict:
    r = requests.get(
        f"https://api.spoonacular.com/recipes/{recipe_id}/information",
        headers={"x-api-key": API_KEY},
    )
    r.raise_for_status()
    return r.json()


def print_steps(info: dict) -> None:
    sections = info.get("analyzedInstructions") or []
    if sections:
        for section in sections:
            if section["name"]:
                print(f"-- {section['name']}")
            for step in section["steps"]:
                print(f"{step['number']}. {step['step']}")
    elif info.get("instructions"):
        soup = BeautifulSoup(info["instructions"], "html.parser")
        steps = [li.get_text(strip=True) for li in soup.find_all("li")] or [
            soup.get_text(" ", strip=True)
        ]
        for i, s in enumerate(steps, 1):
            print(f"{i}. {s}")
    else:
        print("Pas d'instructions détaillées, voir la source.")


def print_recipe(info: dict) -> None:
    print(
        f"\n=== {info['title']} ({info['readyInMinutes']} min, {info['servings']} portions)"
    )
    print("Ingrédients :")
    for ing in info["extendedIngredients"]:
        print(" -", ing["original"])
    print("Étapes :")
    print_steps(info)
    print("Source :", info["sourceUrl"])


def has_steps(info: dict) -> bool:
    if info.get("analyzedInstructions"):
        return True
    return bool((info.get("instructions") or "").strip())


def feasible_recipes(candidates: list[dict], stock: dict, x: int = 3) -> list[dict]:
    results = []
    for r in candidates:
        if check_quantities(r, stock):
            continue
        info = get_recipe_details(r["id"])
        if has_steps(info):
            results.append(info)
        if len(results) == x:
            break
    return results


if __name__ == "__main__":
    candidates = find_recipes(list(stock), number=20)

    # for rec in candidates:
    #     pb = check_quantities(rec, stock)
    #     print(rec["title"], "✓" if not pb else f"⚠ {pb}")

    for info in feasible_recipes(candidates, stock, x=3):
        print_recipe(info)
