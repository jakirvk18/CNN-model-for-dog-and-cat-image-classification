import os
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, random_split
import matplotlib.pyplot as plt
from tqdm import tqdm
from PIL import Image, UnidentifiedImageError


# -----------------------
# Safe ImageFolder (skips corrupt files)
# -----------------------
class SafeImageFolder(datasets.ImageFolder):
    def __getitem__(self, index):
        try:
            return super().__getitem__(index)
        except (UnidentifiedImageError, OSError, Exception):
            # Return a random valid sample instead
            return self.__getitem__((index + 1) % len(self))

    def __len__(self):
        return super().__len__()


# -----------------------
# CNN Model
# -----------------------
class DogCatCNN(nn.Module):
    def __init__(self):
        super().__init__()

        self.conv = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )

        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 16 * 16, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 2)
        )

    def forward(self, x):
        x = self.conv(x)
        x = self.fc(x)
        return x


def main():

    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("Using device:", DEVICE)

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATASET_PATH = os.path.join(BASE_DIR, "dog_cat_dataset", "dataset")

    transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],  # ImageNet stats work well
                             std=[0.229, 0.224, 0.225])
    ])

    # Use SafeImageFolder instead of ImageFolder
    full_dataset = SafeImageFolder(DATASET_PATH, transform=transform)

    print("Classes:", full_dataset.classes)
    print("Total images:", len(full_dataset))

    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=32, num_workers=0)

    model = DogCatCNN().to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    EPOCHS = 10
    best_acc = 0
    train_accs, val_accs = [], []

    for epoch in range(EPOCHS):

        model.train()
        correct, total = 0, 0
        loop = tqdm(train_loader, desc=f"Epoch [{epoch+1}/{EPOCHS}]")

        for images, labels in loop:
            images, labels = images.to(DEVICE), labels.to(DEVICE)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            preds = outputs.argmax(1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            loop.set_postfix(loss=loss.item())

        train_acc = 100 * correct / total

        model.eval()
        correct, total = 0, 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                outputs = model(images)
                preds = outputs.argmax(1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)

        val_acc = 100 * correct / total
        train_accs.append(train_acc)
        val_accs.append(val_acc)

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), "dogcat_model.pth")

        print(f"Epoch {epoch+1}/{EPOCHS} | Train {train_acc:.2f}% | Val {val_acc:.2f}%")

    plt.figure(figsize=(8, 5))
    plt.plot(train_accs, label="Train Accuracy")
    plt.plot(val_accs, label="Validation Accuracy")
    plt.legend()
    plt.title("Training Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy (%)")
    plt.savefig("training_curves.png")
    plt.show()

    print("Training complete")
    print("Best Validation Accuracy:", best_acc)


if __name__ == "__main__":
    main()

"""
Epoch 10/10 | Train 93.19% | Val 87.38%
Training complete
Best Validation Accuracy: 88.32
"""