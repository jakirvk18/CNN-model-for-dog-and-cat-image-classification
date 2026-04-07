"""
PetLens AI — FastAPI Backend
Matches the frontend's expected JSON shape exactly.

Install:
    pip install fastapi uvicorn[standard] torch torchvision pillow python-multipart

Run:
    uvicorn main:app --reload --port 8000
"""

import io
import os
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from torchvision import transforms

# ── Model definition (must match train.py exactly) ──────────────
class DogCatCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.fc = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 16 * 16, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 2),
        )

    def forward(self, x):
        return self.fc(self.conv(x))


# ── App setup ────────────────────────────────────────────────────
app = FastAPI(title="PetLens AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Device & model loading ───────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CLASSES = ["Cat", "Dog"]  # must match ImageFolder alphabetical order
EMOJIS  = {"Cat": "🐱", "Dog": "🐶"}
MODEL_PATH = Path(__file__).parent / "dogcat_model.pth"

model: DogCatCNN | None = None
model_loaded = False

def load_model():
    global model, model_loaded
    m = DogCatCNN().to(DEVICE)
    m.eval()
    if MODEL_PATH.exists():
        try:
            m.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
            model_loaded = True
            print(f"✅ Model loaded from {MODEL_PATH} on {DEVICE}")
        except Exception as e:
            model_loaded = False
            print(f"⚠  Could not load weights: {e}. Running in demo mode.")
    else:
        model_loaded = False
        print("⚠  dogcat_model.pth not found. Running in demo mode.")
    model = m

load_model()

# ── Image transform (same as training) ──────────────────────────
TRANSFORM = transforms.Compose([
    transforms.Resize((128, 128)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

def confidence_tier(pct: float) -> str:
    if pct >= 95: return "Very High"
    if pct >= 80: return "High"
    if pct >= 65: return "Medium"
    return "Low"


# ── Core inference ───────────────────────────────────────────────
async def run_inference(file: UploadFile, source: str) -> dict:
    # Read & validate image
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file.")

    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
    except (UnidentifiedImageError, Exception):
        raise HTTPException(status_code=422, detail="Cannot identify image. Upload a valid JPG/PNG/WEBP.")

    tensor = TRANSFORM(img).unsqueeze(0).to(DEVICE)  # (1, 3, 128, 128)

    t0 = time.perf_counter()

    if model_loaded:
        with torch.no_grad():
            logits = model(tensor)                          # (1, 2)
            probs  = F.softmax(logits, dim=1)[0]           # (2,)
    else:
        # Demo mode: random plausible output
        import random
        probs_raw = [random.uniform(0.3, 0.7), 0]
        probs_raw[1] = 1.0 - probs_raw[0]
        probs = torch.tensor(probs_raw)

    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    pred_idx    = int(probs.argmax())
    prediction  = CLASSES[pred_idx]
    cat_pct     = round(float(probs[0]) * 100, 1)
    dog_pct     = round(float(probs[1]) * 100, 1)
    confidence  = round(float(probs[pred_idx]) * 100, 1)

    return {
        "prediction":       prediction,
        "confidence":       confidence,
        "confidence_tier":  confidence_tier(confidence),
        "probabilities": {
            "Cat": cat_pct,
            "Dog": dog_pct,
        },
        "emoji":        EMOJIS[prediction],
        "inference_ms": inference_ms,
        "source":       source,
        "model_loaded": model_loaded,
    }


# ── Routes ───────────────────────────────────────────────────────
@app.get("/")
def health():
    return {
        "status":       "ok",
        "model_loaded": model_loaded,
        "device":       str(DEVICE),
    }


@app.post("/predict/upload")
async def predict_upload(file: UploadFile = File(...)):
    """Classify an image uploaded from disk."""
    return await run_inference(file, source="upload")


@app.post("/predict/camera")
async def predict_camera(file: UploadFile = File(...)):
    """Classify an image captured from the device camera."""
    return await run_inference(file, source="camera")


# ── Dev entrypoint ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)