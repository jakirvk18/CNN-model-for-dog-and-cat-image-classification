🐾 PetLens AI — Advanced Pet Classifier

An interactive, full-stack deep learning suite designed to classify cats and dogs with high precision. This project bridges a custom CNN architecture with a modern React interface.

⚡ Quick Start

1. The Engine (Backend)

# Install dependencies
pip install fastapi uvicorn[standard] torch torchvision pillow python-multipart

# Fire up the API
uvicorn main:app --reload --port 8000


2. The Interface (Frontend)

# Update API constant in App.js to http://localhost:8000
npm install
npm start


🧠 System Architecture

The application follows a Decoupled Microservices pattern. The frontend captures environmental data and streams it to the inference engine.

Layer

Technology

Role

Client

React 18+

Camera stream handling & UI state

API

FastAPI

Async request queuing & Image processing

Inference

PyTorch

Forward pass through DogCatCNN

Hardware

CUDA / CPU

Tensor acceleration

🛠 Model Specifications

The DogCatCNN is optimized for binary classification on $128 \times 128$ inputs.

The Layer Stack

Feature Extraction: 3x Conv Layers ($3 \to 32 \to 64 \to 128$ filters)

Activation: Non-linear ReLU units

Pooling: $2 \times 2$ Max Pooling for spatial reduction

Classifier: Flattened vector $\to$ 256 Dense $\to$ Dropout (0.5) $\to$ 2 Classes

📸 Interactive Features

Viewfinder Overlay: Real-time CSS scan-line and corner brackets for a "high-tech" feel.

Dynamic Theming: UI accents shift between Blue (Cat) and Orange (Dog) based on predictions.

Radial Confidence: SVG-based circular progress bars showing real-time probability splits.

Session History: Persistence layer to track recent scans within the current session.

📂 Project Structure

.
├── backend/
│   ├── main.py            # FastAPI Inference Server
│   ├── train.py           # PyTorch Training Script
│   └── dogcat_model.pth   # Trained Weights
└── frontend/
    ├── src/
    │   └── App.js         # React UI & Camera Logic
    └── package.json


🤝 Collaboration

Developed by Shaik Jakir Hussain & NZK Team.
Focused on translating machine learning insights into user-focused impact.

PetLens AI is part of a research initiative in vision-based AI. 🐱🐶
