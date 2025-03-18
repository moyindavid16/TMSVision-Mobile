import { Point } from "../App";

export const getMarkerTiltDirections = (
  currentPoints: Point[],
  vectors: { x: number; y: number }[][],
  leftEyeCenter: Point,
  rightEyeCenter: Point,
  noseLowerCenter: Point,
): string[] => {
  "worklet";
  if (vectors.length === 0) {
    return [];
  }

  // Calculate expected positions based on vectors
  const expectedPoints = vectors.map((pointVectors) => {
    // Each pointVectors array contains [leftEyeVector, rightEyeVector, noseLowerVector]
    // average all three vectors for more stable positioning
    const basePoints = [leftEyeCenter, rightEyeCenter, noseLowerCenter];
    const expectedPositions = pointVectors.map((vector, i) => ({
      x: basePoints[i].x + vector.x,
      y: basePoints[i].y + vector.y,
    }));

    // Average the positions from all three vectors
    return {
      x: expectedPositions.reduce((sum, pos) => sum + pos.x, 0) / 3,
      y: expectedPositions.reduce((sum, pos) => sum + pos.y, 0) / 3,
    };
  });

  const directions: string[] = [];
  const pixelThreshold = 10; // 10 pixels threshold for error

  // Calculate average error in x and y coordinates
  const xErrors = currentPoints.map(
    (current, i) => current.x - expectedPoints[i].x,
  );
  const yErrors = currentPoints.map(
    (current, i) => current.y - expectedPoints[i].y,
  );

  // Average error (preserving sign)
  const avgXError = xErrors.reduce((sum, err) => sum + err, 0) / xErrors.length;
  const avgYError = yErrors.reduce((sum, err) => sum + err, 0) / yErrors.length;

  // Check vertical tilt (up/down)
  if (Math.abs(avgYError) > pixelThreshold) {
    // If average y error is positive, points are too low (need to tilt up)
    // If average y error is negative, points are too high (need to tilt down)
    if (avgYError > 0) {
      directions.push("Tilt up");
    } else {
      directions.push("Tilt down");
    }
  }

  // Check horizontal tilt (left/right)
  if (Math.abs(avgXError) > pixelThreshold) {
    // If average x error is positive, points are too far right (need to tilt left)
    // If average x error is negative, points are too far left (need to tilt right)
    if (avgXError > 0) {
      directions.push("Tilt left");
    } else {
      directions.push("Tilt right");
    }
  }

  return directions;
};
