import torch
from matplotlib import pyplot as plt
from torch import nn

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

def train(
    model,
    train_load,
    val_load,
    epochs=10,
    learning_rate=1e-5,
):
    print("train")
    print(len(train_load))
    print(len(val_load))
    model.to(device)
    optimizer = torch.optim.Adam(
        model.parameters(), lr=learning_rate, weight_decay=1e-4
    )

    loss_function = nn.CrossEntropyLoss()

    best_val, best_state, best_epoch = float("inf"), None, 0
    train_losses = []
    val_losses = []

    for epoch in range(epochs):
        print(epoch)
        model.train()
        total, seen = 0.0, 0
        for xb, yb in train_load:
            print(yb)
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            loss = loss_function(model(xb), yb)
            loss.backward()
            optimizer.step()
            total += loss.item() * len(xb)
            seen += len(xb)
        train_loss = total / seen
        train_losses.append(train_loss)

        model.eval()
        total, seen, correct = 0.0, 0, 0
        with torch.no_grad():
            total, seen = 0.0, 0
            for xb, yb in val_load:
                xb, yb = xb.to(device), yb.to(device)
                val_logits = model(xb)
                total += loss_function(val_logits, yb).item() * len(xb)
                correct += (val_logits.argmax(1) == yb).sum().item()
                seen += len(xb)
        val_loss = total / seen
        val_losses.append(val_loss) 
        print(f"epoch {epoch}: train={train_loss:.4f} val={val_loss:.4f}")
        if val_loss < best_val:
            best_val, best_epoch = val_loss, epoch
            best_state = {k: v.clone() for k, v in model.state_dict().items()}

    plt.plot(train_losses, label="train")
    plt.plot(val_losses, label = "val")
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.title('Training Loss')
    plt.show()

    model.load_state_dict(best_state)
    print(f"meilleur modèle : époque {best_epoch}, val={best_val:.4f}")

    return model

