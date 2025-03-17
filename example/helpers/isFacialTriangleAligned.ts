import { Point } from "../App";

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
  threshold: number,
): boolean => {
  "worklet";
  return (
    Math.abs(calibratedPoints.leftEyeCenter.x - currentPoints.leftEyeCenter.x) /
      Math.abs(calibratedPoints.leftEyeCenter.x) <
      threshold &&
    Math.abs(calibratedPoints.leftEyeCenter.y - currentPoints.leftEyeCenter.y) /
      Math.abs(calibratedPoints.leftEyeCenter.y) <
      threshold &&
    Math.abs(
      calibratedPoints.rightEyeCenter.x - currentPoints.rightEyeCenter.x,
    ) /
      Math.abs(calibratedPoints.rightEyeCenter.x) <
      threshold &&
    Math.abs(
      calibratedPoints.rightEyeCenter.y - currentPoints.rightEyeCenter.y,
    ) /
      Math.abs(calibratedPoints.rightEyeCenter.y) <
      threshold &&
    Math.abs(
      calibratedPoints.noseLowerCenter.x - currentPoints.noseLowerCenter.x,
    ) /
      Math.abs(calibratedPoints.noseLowerCenter.x) <
      threshold &&
    Math.abs(
      calibratedPoints.noseLowerCenter.y - currentPoints.noseLowerCenter.y,
    ) /
      Math.abs(calibratedPoints.noseLowerCenter.y) <
      threshold
  );
};
