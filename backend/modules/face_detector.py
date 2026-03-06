"""
Face Detection Module.

Uses OpenCV's Haar Cascade classifier for face detection.
Supports both single and multiple face detection in images and video frames.
"""

import cv2
import numpy as np
from typing import List, Tuple


class FaceDetector:
    """Detect faces in images using OpenCV Haar Cascade."""

    def __init__(self, scale_factor: float = 1.1, min_neighbors: int = 5, min_size: int = 30):
        """
        Initialize face detector.

        Args:
            scale_factor: Image size reduction at each scale.
            min_neighbors: Min neighbors for detection robustness.
            min_size: Minimum face size in pixels.
        """
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"  # type: ignore
        self.detector = cv2.CascadeClassifier(cascade_path)

        if self.detector.empty():
            raise RuntimeError(f"Failed to load Haar Cascade from: {cascade_path}")

        self.scale_factor = scale_factor
        self.min_neighbors = min_neighbors
        self.min_size = (min_size, min_size)

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in an image.

        Args:
            image: Input image (BGR or grayscale).

        Returns:
            List of (x, y, width, height) tuples for each detected face.
        """
        # Convert to grayscale if needed
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Histogram equalization for better detection
        gray = cv2.equalizeHist(gray)

        # Detect faces
        faces = self.detector.detectMultiScale(
            gray,
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors,
            minSize=self.min_size,
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

        if len(faces) == 0:
            return []

        return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]

    def extract_faces(
        self, image: np.ndarray, padding: float = 0.1
    ) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
        """
        Detect and extract face regions from an image.

        Args:
            image: Input image.
            padding: Padding around detected face (as fraction of face size).

        Returns:
            List of (face_image, bounding_box) tuples.
        """
        faces = self.detect_faces(image)
        results = []

        h_img, w_img = image.shape[:2]

        for (x, y, w, h) in faces:
            # Add padding
            pad_x = int(w * padding)
            pad_y = int(h * padding)

            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(w_img, x + w + pad_x)
            y2 = min(h_img, y + h + pad_y)

            face_img = image[y1:y2, x1:x2]
            results.append((face_img, (x, y, w, h)))

        return results

    def draw_detections(
        self,
        image: np.ndarray,
        faces: List[Tuple[int, int, int, int]],
        labels: List[str] = None,
        confidences: List[float] = None,
    ) -> np.ndarray:
        """
        Draw bounding boxes and labels on the image.

        Args:
            image: Input image to draw on.
            faces: List of face bounding boxes.
            labels: Optional emotion labels.
            confidences: Optional confidence scores.

        Returns:
            Image with drawn detections.
        """
        output = image.copy()

        EMOTION_COLORS = {
            "Happy": (36, 191, 251),
            "Sad": (250, 165, 96),
            "Angry": (68, 68, 239),
            "Surprise": (250, 139, 167),
            "Fear": (22, 163, 249),
            "Disgust": (129, 185, 16),
            "Neutral": (184, 163, 148),
        }

        for i, (x, y, w, h) in enumerate(faces):
            label = labels[i] if labels and i < len(labels) else "Face"
            conf = confidences[i] if confidences and i < len(confidences) else 0.0
            color = EMOTION_COLORS.get(label, (255, 180, 100))

            # Draw bounding box
            cv2.rectangle(output, (x, y), (x + w, y + h), color, 2)

            # Draw label
            text = f"{label} {conf:.0f}%" if conf > 0 else label
            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]

            # Label background
            cv2.rectangle(
                output,
                (x, y - text_size[1] - 10),
                (x + text_size[0] + 10, y),
                color,
                -1,
            )

            # Label text
            cv2.putText(
                output,
                text,
                (x + 5, y - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 0, 0),
                2,
            )

        return output
