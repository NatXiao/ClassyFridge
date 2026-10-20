import torch

import torchvision.transforms as transforms

from PIL import Image


device = torch.accelerator.current_accelerator().type if torch.accelerator.is_available() else "cpu"


if __name__ == "__main__":

    model = torch.load('./mushroom-classifier/result/mushroom.pth', weights_only=False)

    model.eval()

