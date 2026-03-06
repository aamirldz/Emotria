"""
CNN Model Architecture for Facial Expression Recognition.

Architecture:
  Input(48x48x1) → Conv2D(32) → ReLU → MaxPool →
  Conv2D(64) → ReLU → MaxPool →
  Conv2D(128) → ReLU → MaxPool →
  Flatten → Dense(256) → Dropout(0.5) →
  Dense(7, softmax)

Trained on FER2013 dataset with 7 emotion classes:
  0=Angry, 1=Disgust, 2=Fear, 3=Happy, 4=Sad, 5=Surprise, 6=Neutral
"""

import os

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers  # type: ignore

    HAS_TF = True
except ImportError:
    HAS_TF = False

EMOTION_LABELS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]
IMG_SIZE = 48
NUM_CLASSES = 7


def build_model() -> "keras.Model":
    """Build the CNN model for facial expression recognition."""
    if not HAS_TF:
        raise RuntimeError("TensorFlow is not installed. Run: pip install tensorflow")

    model = keras.Sequential(
        [
            # Input layer
            layers.Input(shape=(IMG_SIZE, IMG_SIZE, 1)),
            # Block 1
            layers.Conv2D(32, (3, 3), padding="same"),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.Conv2D(32, (3, 3), padding="same"),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.MaxPooling2D(pool_size=(2, 2)),
            layers.Dropout(0.25),
            # Block 2
            layers.Conv2D(64, (3, 3), padding="same"),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.Conv2D(64, (3, 3), padding="same"),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.MaxPooling2D(pool_size=(2, 2)),
            layers.Dropout(0.25),
            # Block 3
            layers.Conv2D(128, (3, 3), padding="same"),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.Conv2D(128, (3, 3), padding="same"),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.MaxPooling2D(pool_size=(2, 2)),
            layers.Dropout(0.25),
            # Classification head
            layers.Flatten(),
            layers.Dense(256),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.Dropout(0.5),
            layers.Dense(128),
            layers.BatchNormalization(),
            layers.Activation("relu"),
            layers.Dropout(0.5),
            layers.Dense(NUM_CLASSES, activation="softmax"),
        ],
        name="FacialExpressionCNN",
    )

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.0001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


def get_model_path() -> str:
    """Return the default path for the saved model."""
    return os.path.join(os.path.dirname(__file__), "emotion_model.h5")


if __name__ == "__main__":
    model = build_model()
    model.summary()
    print(f"\nModel will be saved to: {get_model_path()}")
