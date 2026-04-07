# 🐾 PetLens AI — Dog vs Cat Classifier

> A full-stack AI app that classifies pets(dogs , cats) from photos using a custom PyTorch CNN, served via FastAPI, with a polished React frontend.

---

## 📸 Demo
<img width="379" height="805" alt="image" src="https://github.com/user-attachments/assets/a72bdeb2-a618-43fe-8ee6-760b4c77c438" />


---

## 🧠 Model

| Detail | Value |
|---|---|
| Architecture | Custom 3-block CNN |
| Input size | 128 × 128 RGB |
| Training split | 80% train / 20% val |
| Optimizer | Adam (lr = 0.001) |
| Loss | CrossEntropyLoss |
| Epochs | 10 |
| Best Val Accuracy | **88.32%** |

### Architecture overview

```
Conv2d(3→32) → ReLU → MaxPool
Conv2d(32→64) → ReLU → MaxPool
Conv2d(64→128) → ReLU → MaxPool
Flatten → Linear(32768→256) → ReLU → Dropout(0.5) → Linear(256→2)
```

---

## 🗂️ Project Structure

```
petlens/
├── backend/
│   ├── train.py                  # Model definition + training script
│   ├── main.py                   # FastAPI backend
│   ├── dogcat_model.pth          # Saved model weights (generated after training)
│   ├── training_curves.png       # Accuracy plot (generated after training)
│   └── dog_cat_dataset/
│       └── dataset/
│           ├── cats/             # Training images — cats
│           └── dogs/             # Training images — dogs
└── frontend/
    └── App.jsx                   # React frontend
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/jakirvk18/petlens.git
cd petlens
```

### 2. Install Python dependencies

```bash
pip install fastapi uvicorn[standard] torch torchvision pillow python-multipart tqdm matplotlib
```

### 3. Prepare the dataset

Organize your images under `backend/dog_cat_dataset/dataset/` with one subfolder per class:

```
dataset/
├── cats/   ← put all cat images here
└── dogs/   ← put all dog images here
```

### 4. Train the model

```bash
cd backend
python train.py
```

This will produce `dogcat_model.pth` and `training_curves.png` inside the `backend/` folder.

### 5. Start the API server

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Visit [http://localhost:8000](http://localhost:8000) to confirm the health check response:

```json
{ "status": "ok", "model_loaded": true, "device": "cpu" }
```

### 6. Run the frontend

In `App.jsx`, update the API constant to your server address:

```js
const API = "http://localhost:8000";
```

Then start your React app (Vite / CRA / etc.):

```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Reference

### `GET /`
Health check.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "device": "cpu"
}
```

---

### `POST /predict/upload`
Classify an image uploaded from disk.

**Body:** `multipart/form-data` with a `file` field (JPG / PNG / WEBP).

---

### `POST /predict/camera`
Classify an image captured from the device camera.

**Body:** `multipart/form-data` with a `file` field.

---

**Both prediction endpoints return:**

```json
{
  "prediction": "Dog",
  "confidence": 94.3,
  "confidence_tier": "Very High",
  "probabilities": {
    "Cat": 5.7,
    "Dog": 94.3
  },
  "emoji": "🐶",
  "inference_ms": 12.4,
  "source": "upload",
  "model_loaded": true
}
```

| Field | Description |
|---|---|
| `prediction` | `"Cat"` or `"Dog"` |
| `confidence` | Probability of the winning class (%) |
| `confidence_tier` | `"Very High"` ≥95% · `"High"` ≥80% · `"Medium"` ≥65% · `"Low"` |
| `probabilities` | Per-class softmax scores |
| `inference_ms` | Server-side model latency |
| `source` | `"upload"` or `"camera"` |
| `model_loaded` | `false` = demo mode (random predictions) |

---

## 🖥️ Frontend Features

- **Upload tab** — drag-and-drop or browse for an image
- **Camera tab** — live camera feed with capture button
- **Result card** — animated confidence arcs, prediction badge, inference time
- **History** — last 6 predictions shown inline
- **Demo mode warning** — displayed if `dogcat_model.pth` is missing

---

## ⚠️ Demo Mode

If `dogcat_model.pth` is not found, the server starts in **demo mode** and returns random predictions. Train the model first (step 4 above) to get real results.

---

## 📊 Training Results

```
Epoch 10/10 | Train 93.19% | Val 87.38%
Best Validation Accuracy: 88.32%
```

The accuracy curve is saved automatically to `backend/training_curves.png` after training.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Model | PyTorch (custom CNN) |
| Backend | FastAPI + Uvicorn |
| Frontend | React + inline CSS |
| Image processing | Torchvision transforms, Pillow |
| Training utilities | tqdm, Matplotlib |

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

Made with ❤️ by [Jakir Hussain](https://github.com/jakirvk18)
