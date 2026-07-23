/**
 * FaceDetectionPort — abstraction over face presence detection.
 *
 * Enables swapping between local OpenCV, cloud providers (Face++, AWS Rekognition,
 * Azure Face), or a no-op stub for testing.
 */
export const FACE_DETECTION_PORT = Symbol("FACE_DETECTION_PORT");

export type FaceDetectionInput = {
  buffer: Buffer;
  mime: string;
};

export type FaceDetectionResult = {
  facePresent: boolean;
  confidence: number;
  landmarks?: { x: number; y: number }[];
};

export interface FaceDetectionPort {
  detect(input: FaceDetectionInput): Promise<FaceDetectionResult>;
}
