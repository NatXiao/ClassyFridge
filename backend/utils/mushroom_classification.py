

import io
from pathlib import Path

from PIL import Image
import numpy
import torch


from mushroom_classifier.mnn import MushroomNeuralNetwork
from mushroom_classifier.mnn import transform_image
from mushroom_classifier.mnn import device


MODELS_PATH = "models"
MODEL_PATH = Path(f"./{MODELS_PATH}/mushroom.pth")


def get_model() -> MushroomNeuralNetwork:

    weights = torch.load(MODEL_PATH, weights_only=True, map_location=device)
    
    model = MushroomNeuralNetwork()
    model.load_state_dict(weights)
    model.eval()

    return model

    
def _load_image(source):
    if isinstance(source, Image.Image):
        image = source
    elif isinstance(source, (bytes, bytearray)):
        image = Image.open(io.BytesIO(source))
    elif isinstance(source, numpy.ndarray):
        image = Image.fromarray(source)
    else:
        image = Image.open(source) 
    return image.convert("RGB")


def is_poisonous(image) -> bool:

    model = get_model()
    
    image = _load_image(image)
    image = transform_image(image).unsqueeze(0)

    with torch.no_grad():
        pred = model(image)

    prob = torch.nn.functional.softmax(pred, dim=1)

    prob_class_0 = prob[0][0].item() * 100
    prob_class_1 = prob[0][1].item() * 100

    if prob_class_0 > prob_class_1:
        return False
    elif prob_class_0 <= prob_class_1:
        return True

    return True



