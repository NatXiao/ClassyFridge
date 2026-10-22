
"""
Download data :
uv run ./mushroom-classifier/download.py --metadata --images --subset "m" --size "300" --save_path "./mushroom-classifier/"

Run script :
uv run ./mushroom-classifier/mnn.py

"""


import copy
import os
import time

import torch
import numpy as np
import polars as pl

import matplotlib.pyplot as plt
import torchvision.transforms as transforms

from torch import nn
from torch.utils.data import Dataset
from torch.utils.data import DataLoader

from PIL import Image

device = torch.accelerator.current_accelerator().type if torch.accelerator.is_available() else "cpu"
print(f"Using {device} device")


# HYPER PARAMETERS
IMG_SIZE = (128, 128)
MAX_EPOCHS = 15
LEARNING_RATE = 1e-3
BATCH_SIZE = 256
LOSS_WEIGHTS = [1.0, 1.0]
NUM_WORKER = 10



class MushroomDataset(Dataset):
    def __init__(self, img_path, metadata_path, img_size=(256, 256), subset=-1):

        self.df = pl.read_csv(metadata_path)

        if subset != -1:
            gr_1 = self.df.filter(pl.col("poisonous") == 0).head(subset)
            gr_2 = self.df.filter(pl.col("poisonous") == 1).head(subset)

            self.df = pl.concat([gr_1, gr_2])

        self.image_to_tensor = transforms.Compose([
            transforms.Resize(img_size),
            transforms.ToTensor()
        ])

        self.img_path = img_path
        

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):

        filename = self.df.item(idx, "filename")

        image = Image.open(self.img_path + filename)

        img_tensor = self.image_to_tensor(image)

        X = img_tensor
        y = int(self.df.item(idx, "poisonous"))

        return X, y


# Define model
class FridgeNeuralNetwork(nn.Module):
    def __init__(self):
        super().__init__()

        self.layers = nn.Sequential(
                
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d((2, 2)), # 64x64

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d((2, 2)), # 32x32

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d((2, 2)), # 16x16

            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten(),

            nn.Linear(128, 256),
            nn.ReLU(),
            nn.Dropout(0.5),

            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(0.5),

            nn.Linear(64, 2)

        )



    def forward(self, x):
        return self.layers(x)


if __name__ == "__main__":

    logs = []

    model = FridgeNeuralNetwork().to(device)
    print(model)

    logs.append(model)
    logs.append("\n\n")


    weights = torch.tensor(LOSS_WEIGHTS).to(device)
    loss_fn = nn.CrossEntropyLoss(weight=weights)
    # loss_fn = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-4)

    best_test_loss = None
    best_model = None
    best_epoch = None

    logs.append(optimizer)
    logs.append("\n\n")

    def train(dataloader, model, loss_fn, optimizer) -> float:
        size = len(dataloader.dataset)
        num_batches = len(dataloader)
        model.train()
        train_loss = 0

        for batch, (X, y) in enumerate(dataloader):
            print(f"Loading : {int(batch * 100 / num_batches)}%", end="\r")
            X, y = X.to(device), y.to(device)

            pred = model(X)
            loss = loss_fn(pred, y.long())

            train_loss += loss.item()

            loss.backward()
            optimizer.step()
            optimizer.zero_grad()

            # if batch % 100 == 0:
            loss, current = loss.item(), (batch + 1) * len(X)
            # print(f"loss: {loss:>2f}  [{current:>2d}/{size:>2d}]")

        train_loss /= num_batches
        print(f"Train avg loss: {train_loss:>4f}")
        logs.append(f"Train avg loss: {train_loss:>4f}")
        logs.append("\n")

        return train_loss


    def test(dataloader, model, loss_fn, optimizer) -> float:
            size = len(dataloader.dataset)
            num_batches = len(dataloader)
            model.eval()
            test_loss = 0

            TP, TN, FP, FN = 0, 0, 0, 0

            with torch.no_grad():
                for batch, (X, y) in enumerate(dataloader):
                    print(f"Loading : {int(batch * 100 / num_batches)}%", end="\r")
                    X, y = X.to(device), y.to(device)
        
                    pred = model(X)
                    loss = loss_fn(pred, y.long())

                    test_loss += loss.item()

                    pred_class = pred.argmax(1)

                    actual_positive = (y == 1)
                    actual_negative = (y == 0)
                    pred_positive = (pred_class == 1)
                    pred_negative = (pred_class == 0)

                    TP += (pred_positive & actual_positive).type(torch.float).sum().item()
                    TN += (pred_negative & actual_negative).type(torch.float).sum().item()
                    FP += (pred_positive & actual_negative).type(torch.float).sum().item()
                    FN += (pred_negative & actual_positive).type(torch.float).sum().item()

            test_loss /= num_batches
            # TP /= size

            accuracy = (TP + TN) / (TP + TN + FP + FN)
            precision = TP / (TP + FP) if (TP + FP) > 0 else 0.0
            recall = TP / (TP + FN) if (TP + FN) > 0 else 0.0
            f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0


            print(f"Test avg loss  : {test_loss:>8f}")
            print(f"Accuracy  : {(100*accuracy):>0.1f}%")
            print(f"Precision : {(precision):>0.3f}")
            print(f"Recall    : {(recall):>0.3f}")
            print(f"F1 score  : {(f1_score):>0.3f}")
            print("")

            logs.append(f"Test avg loss  : {test_loss:>8f}")
            logs.append("\n")
            logs.append(f"Accuracy  : {(100*accuracy):>0.1f}%")
            logs.append("\n")
            logs.append(f"Precision : {(precision):>0.3f}")
            logs.append("\n")
            logs.append(f"Recall    : {(recall):>0.3f}")
            logs.append("\n")
            logs.append(f"F1 score  : {(f1_score):>0.3f}")
            logs.append("\n\n")
    
            return test_loss

        

    train_data = MushroomDataset(img_path="./mushroom-classifier/FungiTastic/FungiTastic-Mini/train/300p/", metadata_path="./mushroom-classifier/FungiTastic/metadata/FungiTastic-Mini/FungiTastic-Mini-Train_augmented.csv", img_size=IMG_SIZE, subset=-1)
    train_dataloader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKER)

    test_data = MushroomDataset(img_path="./mushroom-classifier/FungiTastic/FungiTastic-Mini/val/300p/", metadata_path="./mushroom-classifier/FungiTastic/metadata/FungiTastic-Mini/FungiTastic-Mini-Val.csv", img_size=IMG_SIZE, subset=1700)
    test_dataloader = DataLoader(test_data, batch_size=BATCH_SIZE, shuffle=True, num_workers=NUM_WORKER)

    start = time.time()

    loss_train = []
    loss_test = []
    epochs = []
    for t in range(MAX_EPOCHS):
        print(f"Epoch {t+1}")
        logs.append(f"Epoch {t+1}")
        logs.append("\n")

        loss_train.append(train(train_dataloader, model, loss_fn, optimizer))

        loss = test(test_dataloader, model, loss_fn, optimizer)
        loss_test.append(loss)

        if best_test_loss == None or loss < best_test_loss:
            best_test_loss = loss
            best_model = copy.deepcopy(model)
            best_epoch = t

        epochs.append(t)

    end = time.time()
    print(f"Elapsed time : {end-start} s")
    logs.append(f"Elapsed time : {end-start} s")
    logs.append("\n\n")

    if not os.path.exists("./mushroom-classifier/result"):
        os.makedirs("./mushroom-classifier/result")

    logs.append(f"Best Epoch : {best_epoch}\n")
    logs.append(f"Best loss  : {best_test_loss}\n")

    torch.save(best_model.state_dict(), "./mushroom-classifier/result/mushroom.pth")

    plt.plot(epochs, loss_train, label="Train")
    plt.plot(epochs, loss_test, label="Test")
    plt.legend()
    plt.savefig('./mushroom-classifier/result/loss.png')

    with open("./mushroom-classifier/result/logs.txt", "w") as f:
        for l in logs:
            f.write(str(l))

