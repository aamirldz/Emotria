"""
Image Preprocessing Module.

Handles all image preprocessing steps required before emotion classification:
  - Color conversion to grayscale
  - Resizing to model input size (48x48)
  - Pixel normalization to [0, 1]
  - Histogram equalization for contrast enhancement
"""

import cv2
import numpy as np

IMG_SIZE = 48


def preprocess_face(face_image: np.ndarray) -> np.ndarray:
    """
    Preprocess a face image for emotion classification.

    Steps:
      1. Convert to grayscale
      2. Resize to 48x48
      3. Apply histogram equalization
      4. Normalize pixel values to [0, 1]
      5. Reshape for model input (48, 48, 1)

    Args:
        face_image: Input face image (BGR or grayscale).

    Returns:
        Preprocessed image ready for model prediction (48, 48, 1).
    """
    # Convert to grayscale
    if len(face_image.shape) == 3 and face_image.shape[2] == 3:
        gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    else:
        gray = face_image

    # Resize to model input size
    resized = cv2.resize(gray, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA)

    # Histogram equalization for contrast enhancement
    equalized = cv2.equalizeHist(resized)

    # Normalize pixel values to [0, 1]
    normalized = equalized.astype("float32") / 255.0

    # Reshape for model input (batch_size=1, height, width, channels)
    processed = normalized.reshape(1, IMG_SIZE, IMG_SIZE, 1)

    return processed


def preprocess_batch(face_images: list) -> np.ndarray:
    """
    Preprocess a batch of face images.

    Args:
        face_images: List of face images.

    Returns:
        Batch array of shape (N, 48, 48, 1).
    """
    if not face_images:
        return np.array([]).reshape(0, IMG_SIZE, IMG_SIZE, 1)

    processed = []
    for face in face_images:
        p = preprocess_face(face)
        processed.append(p[0])  # Remove batch dimension

    return np.array(processed)
