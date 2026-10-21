# ClassyFridge backend

This backend connects the frontend with the image analysis pipeline and the
recipe API.

## Run the backend

From the project root:

```bash
uv sync --group dev
uv run uvicorn backend.main:app --reload
```

The Swagger documentation is available at <http://127.0.0.1:8000/docs>.

## Routes

### `GET /api/v1/health`

Checks if the backend is running.

### `POST /api/v1/analyses`

Receives the fridge image as `multipart/form-data` using the field name
`image`.

This endpoint should:

1. Decode the uploaded image.
2. Segment the image and create the crops.
3. Send the crops to the classification model.
4. Aggregate the classified ingredients.
5. Return the detected items and ingredient counts to the frontend.

The frontend then displays these results so the user can correct them if
needed. These corrections stay in the frontend.

### `POST /api/v1/recipes/suggestions`

Receives the final ingredient list after the user has validated it and returns
the recipes from the recipe API.

## Where to connect our functions

The routes are in `backend/routes.py`. They should normally not need to be
changed.

The function calls should be added in `backend/services.py`:

- `analyze_image()` should call the image decoder, segmentation/cropping
  function, and classification model. It should then return an
  `AnalysisResponse`.
- `suggest_recipes()` should call the recipe API and return a `RecipeResponse`.

The request and response formats are defined in `backend/schemas.py`. Change
them only if the data exchanged with the frontend changes.

The complete frontend flow is:

```text
Upload image
    → POST /api/v1/analyses
    → display and correct detected ingredients
    → POST /api/v1/recipes/suggestions
    → display recipes
```

Until the real functions are connected, the two application routes return
`501 Not Implemented`.
