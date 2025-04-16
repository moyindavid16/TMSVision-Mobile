import {
  OpenCV,
  ObjectType,
  DataTypes,
  ColorConversionCodes,
  RetrievalModes,
  ContourApproximationModes,
  Rect,
} from "react-native-fast-opencv";

export const getContourRectangles = (
  height: number,
  width: number,
  resized: Uint8Array<ArrayBufferLike>,
  eyeLevel: number,
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
  const formattedRects = rectangles.map((rect) => {
    return OpenCV.toJSValue(rect);
  });
  const filteredRects = formattedRects
    .filter((rect) => rect.y < eyeLevel)
    .sort((a, b) => b.y - a.y)
    .slice(0, 5);

  return filteredRects;
};
