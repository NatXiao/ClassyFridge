import base64

import cv2
import numpy as np

IMG_SIZE = 224


# decode image bytes into a NumPy array
def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode image bytes into a NumPy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode the uploaded image.")

    return image


# resize an image to a target size while maintaining aspect ratio
def resize_image(image, target_size=(IMG_SIZE, IMG_SIZE)):
    original_height, original_width = image.shape[:2]
    target_width, target_height = target_size

    # scaling factors
    scale_width = target_width / original_width
    scale_height = target_height / original_height

    scale = min(scale_width, scale_height)

    # new dimensions
    new_width = max(1, round(original_width * scale))
    new_height = max(1, round(original_height * scale))

    # Resize the image
    resized_image = cv2.resize(
        image, (new_width, new_height), interpolation=cv2.INTER_AREA
    )

    return resized_image


# encode a NumPy array image into bytes
def encode_image(image: np.ndarray) -> bytes:
    success, encoded_image = cv2.imencode(".jpg", image)

    if not success:
        raise ValueError("Could not encode image.")

    return encoded_image.tobytes()


# to use in the JSON schema we need to conver the image to base64 string
def image_to_data_url(image: np.ndarray) -> str:
    image_bytes = encode_image(image)
    encoded = base64.b64encode(image_bytes).decode("ascii")

    return f"data:image/jpeg;base64,{encoded}"
