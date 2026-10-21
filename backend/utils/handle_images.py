import cv2
import numpy as np


# decode image bytes into a NumPy array
def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode image bytes into a NumPy array."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode the uploaded image.")

    return image
