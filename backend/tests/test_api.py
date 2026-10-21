from fastapi.testclient import TestClient

from backend.main import create_app


client = TestClient(create_app())
image = {"image": ("fridge.jpg", b"image bytes", "image/jpeg")}


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_contains_all_routes() -> None:
    paths = client.get("/openapi.json").json()["paths"]
    assert set(paths) == {
        "/api/v1/health",
        "/api/v1/analyses",
        "/api/v1/recipes/suggestions",
    }


def test_image_validation() -> None:
    assert client.post("/api/v1/analyses").status_code == 422

    wrong_type = client.post(
        "/api/v1/analyses",
        files={"image": ("file.txt", b"hello", "text/plain")},
    )
    assert wrong_type.status_code == 415

    empty = client.post(
        "/api/v1/analyses",
        files={"image": ("empty.jpg", b"", "image/jpeg")},
    )
    assert empty.status_code == 400


def test_unconnected_analysis_service_returns_501() -> None:
    response = client.post("/api/v1/analyses", files=image)
    assert response.status_code == 501
    assert response.json() == {"detail": "Analysis pipeline is not connected."}


def test_unconnected_recipe_service_returns_501() -> None:
    response = client.post(
        "/api/v1/recipes/suggestions",
        json={
            "ingredients": [
                {"ingredient_name": "tomato", "instance_count": 2},
            ]
        },
    )
    assert response.status_code == 501
    assert response.json() == {"detail": "Recipe service is not connected."}
