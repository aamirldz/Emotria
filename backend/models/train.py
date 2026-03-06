"""
Training script for the Facial Expression Recognition CNN model.

Usage:
  1. Download FER2013 dataset (fer2013.csv) from:
     https://www.kaggle.com/datasets/msambare/fer2013
  2. Place the CSV file in backend/data/fer2013.csv
  3. Run: python -m models.train

The script will:
  - Load and preprocess the FER2013 dataset
  - Split into training and validation sets
  - Train the CNN model with data augmentation
  - Save the best model to models/emotion_model.h5
"""

import os
import sys
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

try:
    import pandas as pd
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.preprocessing.image import ImageDataGenerator  # type: ignore

    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False

from .cnn_model import build_model, get_model_path, IMG_SIZE, NUM_CLASSES, EMOTION_LABELS


def load_fer2013(csv_path: str):
    """Load FER2013 dataset from CSV file."""
    if not os.path.exists(csv_path):
        print(f"Error: Dataset not found at {csv_path}")
        print("Download FER2013 from: https://www.kaggle.com/datasets/msambare/fer2013")
        print(f"Place the CSV file at: {csv_path}")
        sys.exit(1)

    print("Loading FER2013 dataset...")
    df = pd.read_csv(csv_path)

    pixels = df["pixels"].values
    emotions = df["emotion"].values

    # Convert pixel strings to numpy arrays
    X = np.array([np.fromstring(p, sep=" ") for p in pixels])
    X = X.reshape(-1, IMG_SIZE, IMG_SIZE, 1).astype("float32")

    # Normalize pixel values to [0, 1]
    X = X / 255.0

    # One-hot encode labels
    y = keras.utils.to_categorical(emotions, NUM_CLASSES)

    # Split based on 'Usage' column if available
    if "Usage" in df.columns:
        train_mask = df["Usage"] == "Training"
        test_mask = df["Usage"] == "PublicTest"

        X_train, y_train = X[train_mask], y[train_mask]
        X_test, y_test = X[test_mask], y[test_mask]
    else:
        from sklearn.model_selection import train_test_split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=emotions
        )

    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Image shape: {X_train[0].shape}")
    print(f"Emotion distribution (train):")
    for i, label in enumerate(EMOTION_LABELS):
        count = int(np.sum(y_train[:, i]))
        print(f"  {label}: {count}")

    return X_train, y_train, X_test, y_test


def create_data_augmentation():
    """Create data augmentation generator for training."""
    return ImageDataGenerator(
        rotation_range=15,
        width_shift_range=0.15,
        height_shift_range=0.15,
        horizontal_flip=True,
        zoom_range=0.15,
        shear_range=0.1,
    )


def train_model():
    """Train the emotion recognition model."""
    if not HAS_DEPS:
        print("Missing dependencies. Install with:")
        print("  pip install tensorflow pandas numpy scikit-learn")
        sys.exit(1)

    # Paths
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    csv_path = os.path.join(data_dir, "fer2013.csv")
    model_path = get_model_path()

    # Load data
    X_train, y_train, X_test, y_test = load_fer2013(csv_path)

    # Build model
    print("\nBuilding CNN model...")
    model = build_model()
    model.summary()

    # Data augmentation
    datagen = create_data_augmentation()
    datagen.fit(X_train)

    # Callbacks
    callbacks = [
        keras.callbacks.ModelCheckpoint(
            model_path, monitor="val_accuracy", save_best_only=True, verbose=1
        ),
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=10, restore_best_weights=True, verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6, verbose=1
        ),
    ]

    # Train
    print("\nStarting training...")
    BATCH_SIZE = 64
    EPOCHS = 50

    history = model.fit(
        datagen.flow(X_train, y_train, batch_size=BATCH_SIZE),
        steps_per_epoch=len(X_train) // BATCH_SIZE,
        epochs=EPOCHS,
        validation_data=(X_test, y_test),
        callbacks=callbacks,
        verbose=1,
    )

    # Evaluate
    print("\nEvaluating model...")
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test accuracy: {test_acc:.4f}")
    print(f"Test loss: {test_loss:.4f}")

    # Save final model
    model.save(model_path)
    print(f"\nModel saved to: {model_path}")

    return history


if __name__ == "__main__":
    train_model()
