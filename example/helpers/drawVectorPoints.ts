import { Point } from "../utils/interfaces";

export const drawVectorPoints = (
  frame: any,
  paint: any,
  vectors: { x: number; y: number }[][],
  leftEyeCenter: Point,
  rightEyeCenter: Point,
  noseLowerCenter: Point,
) => {
  "worklet";
  if (vectors.length > 0) {
    vectors.forEach((vectorSet) => {
      const fromLeft = {
        x: leftEyeCenter.x + vectorSet[0].x,
        y: leftEyeCenter.y + vectorSet[0].y,
      };
      const fromRight = {
        x: rightEyeCenter.x + vectorSet[1].x,
        y: rightEyeCenter.y + vectorSet[1].y,
      };
      const fromNose = {
        x: noseLowerCenter.x + vectorSet[2].x,
        y: noseLowerCenter.y + vectorSet[2].y,
      };

      frame.drawCircle(fromLeft.x, fromLeft.y, 5, paint);
      frame.drawCircle(fromRight.x, fromRight.y, 5, paint);
      frame.drawCircle(fromNose.x, fromNose.y, 5, paint);
    });
  }
};
