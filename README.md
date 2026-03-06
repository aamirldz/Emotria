# FaceAI — AI-Based Facial Expression Recognition & Behavior Analysis System

A real-time facial emotion detection system using deep learning (CNN) and computer vision (OpenCV). Features multi-person detection, behavior analytics, and a premium Next.js dashboard with an interactive globe landing page.

## 🎯 Features

- **Real-Time Emotion Detection** — Webcam-based face detection with live emotion classification
- **7 Emotion Classes** — Happy, Sad, Angry, Surprise, Fear, Disgust, Neutral
- **Multi-Person Detection** — Simultaneous emotion recognition for multiple faces
- **Analytics Dashboard** — Live emotion distribution charts, trends, and history
- **Alert System** — Automatic alerts when negative emotions exceed thresholds
- **Data Storage** — SQLite database for emotion history and reporting

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────────────────────────────┐
│   Next.js UI    │◄──►│          FastAPI Backend                 │
│  (Dashboard)    │    │                                          │
│                 │    │  ┌──────────┐  ┌─────────────────────┐  │
│  • Webcam Feed  │    │  │  OpenCV   │  │  CNN Model (48×48)  │  │
│  • Charts       │    │  │  Face     │──│  7 Emotion Classes  │  │
│  • History      │    │  │  Detector │  │  TensorFlow/Keras   │  │
│  • Alerts       │    │  └──────────┘  └─────────────────────┘  │
│  • Globe BG     │    │  ┌──────────┐  ┌─────────────────────┐  │
│                 │    │  │ Analytics │  │  SQLite Database    │  │
│                 │    │  │  Engine   │  │  Emotion History    │  │
│                 │    │  └──────────┘  └─────────────────────┘  │
└─────────────────┘    └──────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (via nvm)
- Python 3.9+

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# → Runs at http://localhost:8000
```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# → Runs at http://localhost:3000
```

### 3. Open the Dashboard
1. Visit `http://localhost:3000`
2. Click "Launch Dashboard"
3. Click "Start Camera" to begin real-time detection

## 🧠 CNN Model Training

To train the model with FER2013 dataset:

1. Download [FER2013](https://www.kaggle.com/datasets/msambare/fer2013) dataset
2. Place `fer2013.csv` in `backend/data/`
3. Install TensorFlow: `pip install tensorflow`
4. Run training:

```bash
cd backend
python -m models.train
```

The trained model will be saved to `backend/models/emotion_model.h5`.

> **Note:** Without a trained model, the system runs in **demo mode** with simulated predictions.

## 📁 Project Structure

```
face/
├── frontend/                  # Next.js + shadcn + Tailwind
│   ├── app/
│   │   ├── page.tsx           # Landing page (globe background)
│   │   ├── dashboard/page.tsx # Analytics dashboard
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── components/ui/
│       ├── interactive-globe.tsx
│       ├── webcam-feed.tsx
│       ├── emotion-chart.tsx
│       ├── emotion-history.tsx
│       └── alert-panel.tsx
├── backend/                   # Python FastAPI
│   ├── main.py                # API server
│   ├── models/
│   │   ├── cnn_model.py       # CNN architecture
│   │   └── train.py           # Training script
│   ├── modules/
│   │   ├── face_detector.py   # OpenCV face detection
│   │   ├── emotion_classifier.py
│   │   ├── preprocessor.py
│   │   └── analytics.py
│   ├── storage/
│   │   └── database.py        # SQLite
│   └── requirements.txt
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | Detect emotions in uploaded image |
| GET | `/api/analytics` | Get emotion distribution |
| GET | `/api/history` | Get detection history |
| GET | `/api/alerts` | Get active alerts |
| GET | `/api/report/daily` | Daily emotion report |
| GET | `/api/report/weekly` | Weekly emotion trend |
| WS | `/ws/detect` | Real-time WebSocket detection |

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn |
| Backend | Python, FastAPI, OpenCV, TensorFlow/Keras |
| Database | SQLite |
| Model | CNN (48×48 grayscale → 7 classes) |
