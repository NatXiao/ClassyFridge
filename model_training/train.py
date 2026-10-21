from pathlib import Path

import torch
from datasets import load_dataset
from finetuning import train
from huggingface_hub import hf_hub_download
from torch.utils.data import ConcatDataset, DataLoader
from torchvision import transforms
from torchvision.models import resnet50

REPO_ID = "ibrahimdaud/raw-food-recognition-models"
CHECKPOINT_FILE = "resnet50_pytorch_model.bin"
DATA_DIR = Path(__file__).resolve().parent / "training_data"
EPOCHS = 10
BATCH_SIZE = 32
LEARNING_RATE = 1e-5
SEED = 38
SUBSET_TRAIN = 700
SUBSET_VAL = 140

checkpoint_path = hf_hub_download(
    repo_id=REPO_ID, filename=CHECKPOINT_FILE
)
checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
])
def transform_image(examples):
    examples['image_pixels'] = [preprocess(img.convert('RGB')) for img in examples['image']]
    return examples

def transform_own(examples):
    examples = transform_image(examples)
    examples["label_id"] = [remap[l] for l in examples["label"]]
    return examples

def collate_fn(batch):
    images = torch.stack([b["image_pixels"] for b in batch])
    labels = torch.tensor([b["label_id"] for b in batch], dtype=torch.long)
    return images, labels

if __name__ == "__main__":
    # add weight
    ds = load_dataset("ibrahimdaud/raw-food-recognition")

    labels = set(zip(ds["train"]["label"], ds["train"]["label_id"]))
    name_to_id = {name.strip().lower(): lid for name, lid in labels}

    new_ds = load_dataset("imagefolder", data_dir=str(DATA_DIR))["train"]
    folder_names = new_ds.features["label"].names

    #map folder name/label to label in ds
    remap, next_id = [], 90
    for name in folder_names:
        key = name.strip().lower()
        if key not in name_to_id:
            name_to_id[key] = next_id
            next_id += 1
            print(f"{name}: NEW class id {name_to_id[key]}")
        else:
            print(f"{name}: existing class id {name_to_id[key]}")
        remap.append(name_to_id[key])
    num_classes = next_id

    new_train = new_ds.train_test_split(test_size = 0.2, seed=SEED)
    own_train = new_train["train"].with_transform(transform_own)
    own_val = new_train["test"].with_transform(transform_own) 

    filtered_train_ds = ds["train"].shuffle(seed=SEED).select(range(SUBSET_TRAIN)).with_transform(transform_image)
    filtered_val_ds = ds["validation"].shuffle(seed=SEED).select(range(SUBSET_VAL)).with_transform(transform_image)

    train_dataset = ConcatDataset([own_train, filtered_train_ds])
    val_dataset=  ConcatDataset([own_val, filtered_val_ds])

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, collate_fn=collate_fn)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, collate_fn=collate_fn)

    model = resnet50(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, 90)
    model.load_state_dict(checkpoint["model_state_dict"])

    train(model, train_loader, val_loader, epochs=EPOCHS, learning_rate=LEARNING_RATE)
    torch.save(model.state_dict(), "finetuned_resnet50.pt")