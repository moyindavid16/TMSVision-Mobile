import { SkPaint } from "@shopify/react-native-skia";
import { DrawableFrame } from "react-native-vision-camera";

import { Point } from "../utils/interfaces";

export const drawFacialTriangle = (
  paint: SkPaint,
  frame: DrawableFrame,
  points: Point[],
) => {
  "worklet";
  frame.drawLine(points[0].x, points[0].y, points[1].x, points[1].y, paint);
  frame.drawLine(points[1].x, points[1].y, points[2].x, points[2].y, paint);
  frame.drawLine(points[2].x, points[2].y, points[0].x, points[0].y, paint);
};
