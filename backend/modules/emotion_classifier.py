"""
Emotion Classification Module.

Loads the trained CNN model and provides emotion prediction functionality.
Falls back to random predictions for demo mode when no trained model is available.
"""

import os
import numpy as np
import random
from typing import Tuple, List

from .preprocessor import preprocess_face, preprocess_batch

EMOTION_LABELS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]

# Try to import TensorFlow
try:
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
    import tensorflow as tf
    from tensorflow import keras

    HAS_TF = True
except ImportError:
    HAS_TF = False


class EmotionClassifier:
    """Classify emotions from preprocessed face images."""

    def __init__(self, model_path: str = None):
        """
        Initialize the emotion classifier.

        Args:
            model_path: Path to the trained model file (.h5).
                       If None, uses default location.
                       If model not found, runs in demo mode with random predictions.
        """
        self.model = None
        self.demo_mode = True

        if model_path is None:
            model_path = os.path.join(
                os.path.dirname(__file__), "..", "models", "emotion_model.h5"
            )

        if HAS_TF and os.path.exists(model_path):
            try:
                self.model = keras.models.load_model(model_path)
                self.demo_mode = False
                print(f"[EmotionClassifier] Model loaded from: {model_path}")
            except Exception as e:
                print(f"[EmotionClassifier] Failed to load model: {e}")
                print("[EmotionClassifier] Running in demo mode.")
        else:
            if not HAS_TF:
                print("[EmotionClassifier] TensorFlow not installed. Running in demo mode.")
            else:
                print(f"[EmotionClassifier] No model found at: {model_path}")
                print("[EmotionClassifier] Running in demo mode with simulated predictions.")

    def predict(self, face_image: np.ndarray) -> Tuple[str, float, List[float]]:
        """
        Predict emotion from a face image.

        Args:
            face_image: Input face image (BGR or grayscale).

        Returns:
            Tuple of (emotion_label, confidence, all_probabilities).
        """
        if self.demo_mode:
            return self._demo_predict()

        # Preprocess
        processed = preprocess_face(face_image)

        # Predict
        predictions = self.model.predict(processed, verbose=0)[0]

        # Get top emotion
        emotion_idx = int(np.argmax(predictions))
        confidence = float(predictions[emotion_idx]) * 100
        probabilities = [float(p) * 100 for p in predictions]

        return EMOTION_LABELS[emotion_idx], confidence, probabilities

    def predict_batch(self, face_images: list) -> List[Tuple[str, float, List[float]]]:
        """
        Predict emotions for a batch of face images.

        Args:
            face_images: List of face images.

        Returns:
            List of (emotion_label, confidence, all_probabilities) tuples.
        """
        if not face_images:
            return []

        if self.demo_mode:
            return [self._demo_predict() for _ in face_images]

        # Preprocess batch
        batch = preprocess_batch(face_images)

        # Predict
        predictions = self.model.predict(batch, verbose=0)

        results = []
        for pred in predictions:
            emotion_idx = int(np.argmax(pred))
            confidence = float(pred[emotion_idx]) * 100
            probabilities = [float(p) * 100 for p in pred]
            results.append((EMOTION_LABELS[emotion_idx], confidence, probabilities))

        return results

    def _demo_predict(self) -> Tuple[str, float, List[float]]:
        """Generate a realistic demo prediction."""
        # Weighted random — more likely to detect Happy/Neutral
        weights = [0.08, 0.04, 0.06, 0.30, 0.12, 0.05, 0.35]
        emotion_idx = random.choices(range(len(EMOTION_LABELS)), weights=weights, k=1)[0]

        # Generate realistic confidence
        confidence = random.uniform(65, 98)

        # Generate plausible probability distribution
        probabilities = [random.uniform(1, 10) for _ in EMOTION_LABELS]
        probabilities[emotion_idx] = confidence
        total = sum(probabilities)
        probabilities = [(p / total) * 100 for p in probabilities]

        return EMOTION_LABELS[emotion_idx], confidence, probabilities

    @property
    def is_demo_mode(self) -> bool:
        """Check if running in demo mode."""
        return self.demo_mode
