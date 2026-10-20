
"""
Download data :
uv run ./mushroom-classifier/download.py --metadata --images --subset "m" --size "300" --save_path "./mushroom-classifier/"

Run script :
uv run ./mushroom-classifier/mnn.py

"""


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

from sklearn.model_selection import train_test_split

device = torch.accelerator.current_accelerator().type if torch.accelerator.is_available() else "cpu"
print(f"Using {device} device")


# HYPER PARAMETERS
IMG_SIZE = (256, 256)
MAX_EPOCHS = 50
LEARNING_RATE = 1e-3
BATCH_SIZE = 64



IMG_SIZE = (128, 128)
MAX_EPOCHS = 20
LEARNING_RATE = 1e-3
BATCH_SIZE = 64
LOSS_WEIGHTS= [1.0, 1.0]



class MushroomDataset(Dataset):
    def __init__(self, img_path, metadata_path, img_size=(256, 256)):

        self.df = pl.read_csv(metadata_path)

        # gr_1 = self.df.filter(pl.col("poisonous") == 0).head(1500)
        # gr_2 = self.df.filter(pl.col("poisonous") == 1).head(1500)

        # self.df = pl.concat([gr_1, gr_2])

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
            nn.MaxPool2d((2, 2)), # 128x128

            # nn.Conv2d(32, 64, kernel_size=3, padding=1),
            # nn.ReLU(),
            # nn.MaxPool2d((2, 2)), # 64x64

            nn.Flatten(),

            nn.Linear(32 * 64 * 64, 1024),  # out_channels * actual_img_size * actual_img_size
            nn.ReLU(),

            # nn.Linear(1024, 64),
            # nn.ReLU(),

            # nn.Linear(64, 2),

            nn.Linear(1024, 2)
        )

    def forward(self, x):
        return self.layers(x)


if __name__ == "__main__":

    model = FridgeNeuralNetwork().to(device)
    print(model)


    weights = torch.tensor(LOSS_WEIGHTS).to(device)
    loss_fn = nn.CrossEntropyLoss(weight=weights)
    # loss_fn = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)


    def train(dataloader, model, loss_fn, optimizer) -> float:
        size = len(dataloader.dataset)
        num_batches = len(dataloader)
        model.train()
        train_loss = 0

        for batch, (X, y) in enumerate(dataloader):
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
        print(f"Avg loss: {train_loss:>4f}")

        return train_loss


    def test(dataloader, model, loss_fn, optimizer) -> float:
            size = len(dataloader.dataset)
            num_batches = len(dataloader)
            model.eval()
            test_loss, correct = 0, 0

            with torch.no_grad():
                for batch, (X, y) in enumerate(dataloader):
                    X, y = X.to(device), y.to(device)
        
                    pred = model(X)
                    loss = loss_fn(pred, y.long())

                    test_loss += loss.item()
                    correct += (pred.argmax(1) == y).type(torch.float).sum().item()

            test_loss /= num_batches
            correct /= size

            print(f"Accuracy: {(100*correct):>0.1f}%, Avg loss: {test_loss:>8f} \n")
    
            return test_loss

        

    train_data = MushroomDataset(img_path="./mushroom-classifier/FungiTastic/FungiTastic-Mini/train/300p/", metadata_path="./mushroom-classifier/FungiTastic/metadata/FungiTastic-Mini/FungiTastic-Mini-Train.csv", img_size=IMG_SIZE)
    train_dataloader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True)

    test_data = MushroomDataset(img_path="./mushroom-classifier/FungiTastic/FungiTastic-Mini/val/300p/", metadata_path="./mushroom-classifier/FungiTastic/metadata/FungiTastic-Mini/FungiTastic-Mini-Val.csv", img_size=IMG_SIZE)
    test_dataloader = DataLoader(test_data, batch_size=BATCH_SIZE, shuffle=True)

    start = time.time()

    loss_train = []
    loss_test = []
    epochs = []
    for t in range(MAX_EPOCHS):
        print(f"Epoch {t+1}")
        loss_train.append(train(train_dataloader, model, loss_fn, optimizer))
        loss_test.append(test(test_dataloader, model, loss_fn, optimizer))
        epochs.append(t)

    end = time.time()
    print(f"Elapsed time : {end-start} s")

    if not os.path.exists("./mushroom-classifier/result"):
        os.makedirs("./mushroom-classifier/result")

    torch.save(model.state_dict(), "./mushroom-classifier/result/mushroom.pth")

    plt.plot(epochs, loss_train, label="Train")
    plt.plot(epochs, loss_test, label="Test")
    plt.legend()
    plt.savefig('./mushroom-classifier/result/loss.png')

