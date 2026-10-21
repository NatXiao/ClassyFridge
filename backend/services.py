"""Integration points for the project's existing ML and recipe functions.

Connect the real implementations in this file. Keeping these calls outside the
routes prevents the HTTP layer from depending on a specific model or API.
"""

from backend.schemas import (
    AnalysisResponse,
    RecipeRequest,
    RecipeResponse,
)


class ServiceNotConfiguredError(RuntimeError):
    """Raised while an existing project function has not yet been connected."""


def analyze_image(
    image: bytes,
    *,
    filename: str,
    content_type: str,
) -> AnalysisResponse:
    """Segment, crop, classify, aggregate, and return the detected ingredients."""
    raise ServiceNotConfiguredError("Analysis pipeline is not connected.")


def suggest_recipes(request: RecipeRequest) -> RecipeResponse:
    """Call the existing recipe API and map its output to the response schema."""
    raise ServiceNotConfiguredError("Recipe service is not connected.")
