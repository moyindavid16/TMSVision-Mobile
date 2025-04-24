import {
  OpenCV,
  ObjectType,
  DataTypes,
  ColorConversionCodes,
  RetrievalModes,
  ContourApproximationModes,
  Rect,
} from "react-native-fast-opencv";
import { Orientation } from "react-native-vision-camera";

import { Point } from "../utils/interfaces";

export const getContourRectangles = (
  height: number,
  width: number,
  resized: Uint8Array<ArrayBufferLike>,
  eyeLevel: number,
  orientation: Orientation,
) => {
  "worklet";

  const src = OpenCV.frameBufferToMat(height, width, 3, resized);
  const dst = OpenCV.createObject(ObjectType.Mat, 0, 0, DataTypes.CV_8U);

  const lowerBound = OpenCV.createObject(ObjectType.Scalar, 40, 80, 100);
  const upperBound = OpenCV.createObject(ObjectType.Scalar, 80, 255, 255);
  OpenCV.invoke("cvtColor", src, dst, ColorConversionCodes.COLOR_BGR2HSV);
  OpenCV.invoke("inRange", dst, lowerBound, upperBound, dst);

  const channels = OpenCV.createObject(ObjectType.MatVector);
  OpenCV.invoke("split", dst, channels);
  const grayChannel = OpenCV.copyObjectFromVector(channels, 0);

  const contours = OpenCV.createObject(ObjectType.MatVector);
  OpenCV.invoke(
    "findContours",
    grayChannel,
    contours,
    RetrievalModes.RETR_TREE,
    ContourApproximationModes.CHAIN_APPROX_SIMPLE,
  );

  const contoursMats = OpenCV.toJSValue(contours);
  const rectangles: Rect[] = [];

  for (let i = 0; i < contoursMats.array.length; i++) {
    const contour = OpenCV.copyObjectFromVector(contours, i);
    const { value: area } = OpenCV.invoke("contourArea", contour, false);
    // console.log(area)
    if (area > 2 && area < 100) {
      const rect = OpenCV.invoke("boundingRect", contour);
      rectangles.push(rect);
    }
  }
  // console.log("Gotten", orientation);
  const transformPointToMatchOrientation = (rect: any) => {
    switch (orientation) {
      case "landscape-right":
        return {
          ...rect,
          x: rect.x,
          y: rect.y,
        };
      case "landscape-left":
        return {
          ...rect,
          x: rect.x,
          y: height - rect.y + rect.height,
        };
      case "portrait":
        return {
          ...rect,
          x: rect.y,
          y: rect.x,
        };
      case "portrait-upside-down":
        return {
          ...rect,
          x: height - rect.y,
          y: width - rect.x,
        };
      default:
        return rect;
    }
  };

  const filterFn = (rect: Point) => {
    switch (orientation) {
      case "landscape-right":
        return rect.y < eyeLevel;
      case "landscape-left":
        return rect.y > eyeLevel;
      case "portrait":
        return rect.x < eyeLevel;
      case "portrait-upside-down":
        return rect.x > eyeLevel;
      default:
        return true;
    }
  };

  const formattedRects = rectangles.map((rect) => {
    return OpenCV.toJSValue(rect);
  });
  // console.log({height, width})
  // console.log(formattedRects.map(transformPointToMatchOrientation))
  console.log(eyeLevel);
  // console.log(formattedRects);
  const filteredRects = formattedRects
    .filter(filterFn)
    .sort(
      (a, b) =>
        transformPointToMatchOrientation(b).y -
        transformPointToMatchOrientation(a).y,
    )
    .slice(0, 5);

  return filteredRects;
};
