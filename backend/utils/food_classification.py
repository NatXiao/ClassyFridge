import json
import os
import random
from functools import lru_cache
from pathlib import Path

import matplotlib.pyplot as plt
import torch
from datasets import load_dataset
from huggingface_hub import hf_hub_download
from torchvision import transforms
from torchvision.models import resnet50
import torch
from torchvision import transforms

import matplotlib.pyplot as plt

from backend.utils.handle_images import load_image
from backend.utils.mushroom_classification import is_poisonous

DEBUGGING = True
MODELS_PATH = "models"
IMG_SIZE = 224
FINETUNED_PATH = Path(f"../{MODELS_PATH}/finetuned_resnet500.pt")
REPO_ID = "ibrahimdaud/raw-food-recognition-models"
DATASET_ID = "ibrahimdaud/raw-food-recognition"

DEBUGGING_DIR = "debugging_images"
CLASS_NAMES_PATH = Path("class_names.json")

preprocess = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def _build_class_names():
    ds = load_dataset(DATASET_ID, split="train")
    ds = ds.select_columns(["label", "label_id"])

    id_to_name = {}
    for name, idx in zip(ds["label"], ds["label_id"]):
        if idx in id_to_name and id_to_name[idx] != name:
            raise ValueError(f"id {idx} maps to both {id_to_name[idx]!r} and {name!r}")
        id_to_name[idx] = name

    ids = sorted(id_to_name)
    if ids != list(range(len(ids))):
        raise ValueError(f"label_ids are not contiguous 0..N-1: {ids}")

    return [id_to_name[i] for i in ids]


@lru_cache(maxsize=1)
def classes_names():
    if not CLASS_NAMES_PATH.exists():
        class_names = _build_class_names()
    with open(CLASS_NAMES_PATH, encoding="utf-8") as f:
        class_names = json.load(f) 
    return class_names, len(class_names)

@lru_cache(maxsize=1)
def get_basic_model(total_classes):
    checkpoint_path = hf_hub_download(
        repo_id=REPO_ID, filename="resnet50_pytorch_model.bin"
    )
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    return _build_model(checkpoint["model_state_dict"], total_classes)

@lru_cache(maxsize=1)
def get_finetuned_model(total_classes):
    if not FINETUNED_PATH.exists():
        return None
    state_dict = torch.load(FINETUNED_PATH, map_location="cpu", weights_only=True)
    return _build_model(state_dict, total_classes)


def _build_model(state_dict, total_classes):
    model = resnet50(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, total_classes)
    model.load_state_dict(state_dict)
    return model.eval()

def recognize_food(image_source, top_k=5):
    class_names, total_classes = classes_names()
    model = get_finetuned_model(total_classes) or get_basic_model(total_classes)
    image = load_image(image_source)
    if DEBUGGING:
        plt.figure(figsize=(6, 6))
        plt.imshow(image)
        plt.axis("off")
        plt.title("Image:")
        plt.savefig(f"{DEBUGGING_DIR}/image{random.randint(1, 10)}")
    tensor = preprocess(image).unsqueeze(0)

    with torch.inference_mode():
        probs = torch.softmax(model(tensor), dim=1)[0]
    scores, indices = torch.topk(probs, min(top_k, total_classes))

    results =  [
        {"label": class_names[i.item()], "confidence": round(s.item(), 4)}
        for s, i in zip(scores, indices)
    ]
    return results

def recognize_food_batch( images, batch_size = 4, top_k=5):
    class_names, total_classes = classes_names()
    model = get_finetuned_model(total_classes) or get_basic_model(total_classes)

    results = []
    for start in range(0, len(images), batch_size):
        chunk = images[start:start + batch_size]
        pil_images = [load_image(img) for img in chunk]
        if DEBUGGING:
            if not os.path.exists(f"{DEBUGGING_DIR}"):
                os.makedirs(f"{DEBUGGING_DIR}")
            for offset, pil in enumerate(pil_images):
                pil.save(f"{DEBUGGING_DIR}/crop_{start + offset}.png")
        batch = torch.stack([preprocess(pil) for pil in pil_images])
        with torch.inference_mode():
            probs = torch.softmax(model(batch), dim=1)
        scores, indices = torch.topk(probs, min(top_k, total_classes))
        results.extend(  [
            {"label": class_names[i.item()], "confidence": round(s.item(), 4)}
            for s, i in zip(row_scores, row_indices)
        ]            
        for row_scores, row_indices in zip(scores, indices)
        )
    return results


def is_not_edible(label, image):

    if label != "mushroom":
        return False

    return is_poisonous(image)