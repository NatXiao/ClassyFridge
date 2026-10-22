

from pathlib import Path

from PIL import Image
import torch


from mushroom_classifier.mnn import MushroomNeuralNetwork
from mushroom_classifier.mnn import transform_image


MODELS_PATH = "models"
MODEL_PATH = Path(f"../{MODELS_PATH}/mushroom.pth")




def get_model() -> MushroomNeuralNetwork:

    weights = torch.load(MODEL_PATH, weights_only=True)
    
    model = MushroomNeuralNetwork()
    model.load_state_dict(weights)
    model.eval()

    return model
    


def is_poisonous(image_source) -> bool:

    model = get_model()
    
    image = Image.open(image_source)
    image = transform_image(image)

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



