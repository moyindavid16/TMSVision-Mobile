import { Point } from "../utils/interfaces";

export const isFacialTriangleAligned = (
  currentPoints: {
    leftEyeCenter: Point;
    rightEyeCenter: Point;
    noseLowerCenter: Point;
  },
  calibratedPoints: {
    leftEyeCenter: Point;
    rightEyeCenter: Point;
    noseLowerCenter: Point;
  },
): boolean => {
  "worklet";
  const threshold = 15 * 3; // pixels

  const withinThreshold = (p1: Point, p2: Point) =>
    Math.abs(p1.x - p2.x) < threshold && Math.abs(p1.y - p2.y) < threshold;

  return (
    withinThreshold(
      currentPoints.leftEyeCenter,
      calibratedPoints.leftEyeCenter,
    ) &&
    withinThreshold(
      currentPoints.rightEyeCenter,
      calibratedPoints.rightEyeCenter,
    ) &&
    withinThreshold(
      currentPoints.noseLowerCenter,
      calibratedPoints.noseLowerCenter,
    )
  );
};
