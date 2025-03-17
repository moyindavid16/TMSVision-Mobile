import { Point } from "../App";

export const calculateRelativeVectors = (
  greenPoints: Point[],
  leftEyeCenter: Point,
  rightEyeCenter: Point,
  noseLowerCenter: Point,
) => {
  "worklet"
  return greenPoints.map((greenPoint) => [
    // Vector from leftEyeCenter to green point
    {
      x: greenPoint.x - leftEyeCenter.x,
      y: greenPoint.y - leftEyeCenter.y,
    },
    // Vector from rightEyeCenter to green point
    {
      x: greenPoint.x - rightEyeCenter.x,
      y: greenPoint.y - rightEyeCenter.y,
    },
    // Vector from noseLowerCenter to green point
    {
      x: greenPoint.x - noseLowerCenter.x,
      y: greenPoint.y - noseLowerCenter.y,
    },
  ]);
};