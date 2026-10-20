import os

import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ["SPOONACULAR"]

ingredient = requests.get(
    "https://api.spoonacular.com/recipes/findByIngredients",
    headers={"x-api-key": API_KEY},
    params={"ingredients": "egg, tomato,cheddar", "number": 10, "ranking": 2},
)
ingredient.raise_for_status()
for rec in ingredient.json():
    print(rec["title"], "-manque :", [i["name"] for i in rec["missedIngredients"]])
    # print(rec)

recipe = ingredient.json()
for rec in recipe[:1]:
    r = requests.get(
        f"https://api.spoonacular.com/recipes/{rec['id']}/information",
        headers={"x-api-key": API_KEY},
    )
    r.raise_for_status()
    info = r.json()

    print(
        f"\n=== {info['title']} ({info['readyInMinutes']} min, {info['servings']} portions)"
    )
    for ing in info["extendedIngredients"]:
        print(" -", ing["original"])
    for section in info.get("analyzedInstructions", []):
        if section["name"]:
            print(f"-- {section['name']}")
        for step in section["steps"]:
            print(f"{step['number']}. {step['step']}")
