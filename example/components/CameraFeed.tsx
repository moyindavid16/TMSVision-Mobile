import { Skia } from "@shopify/react-native-skia";
import { useState } from "react";
import { Button, Text, StyleSheet } from "react-native";
import { OpenCV } from "react-native-fast-opencv";
import {
  Camera,
  Orientation,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useSkiaFrameProcessor,
} from "react-native-vision-camera";
import { ISharedValue, useSharedValue } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";

import { calculateRelativeVectors } from "../helpers/calculateRelativeVectors";
import { drawFacialTriangle } from "../helpers/drawFacialTriangle";
import { drawVectorPoints } from "../helpers/drawVectorPoints";
import { getContourRectangles } from "../helpers/getContourRectangles";
import { getMarkerTiltDirections } from "../helpers/getMarkerTiltDirections";
import { isFacialTriangleAligned } from "../helpers/isFacialTriangleAligned";
import { useVisionLandmarkDetector } from "../ios/VisionFrameProcessor/visionLandmarkDetector";
import { CalibratedPoints, Point, Points } from "../utils/interfaces";

interface CameraFeedProps {
  safeSetFeedBackText: (text: string) => void;
  sharedCalibratedPoints: ISharedValue<CalibratedPoints | null>;
  sharedShouldCalibrate: ISharedValue<boolean>;
  sharedCalibratedBoxArea: ISharedValue<number | null>;
  sharedRelativeVectors: ISharedValue<
    {
      x: number;
      y: number;
    }[][]
  >;
  safeSetFaceAlignedText: (text: string) => void;
  safeSetShowCalibrationModal: (show: boolean) => void;
}

export default function CameraFeed({
  safeSetFeedBackText,
  sharedCalibratedPoints,
  sharedShouldCalibrate,
  sharedCalibratedBoxArea,
  sharedRelativeVectors,
  safeSetFaceAlignedText,
  safeSetShowCalibrationModal,
}: CameraFeedProps) {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const orientation = useSharedValue<Orientation>("landscape-right");
  // console.log(orientation);

  const format = useCameraFormat(device, [
    {
      videoResolution: {
        width: 2016,
        height: 1512,
      },
    },
    {
      fps: 60,
    },
  ]);

  const { resize } = useResizePlugin();
  const { detectVisionLandmarks } = useVisionLandmarkDetector();

  const skiaFrameProcessor = useSkiaFrameProcessor((frame) => {
    "worklet";
    // Prepare paint for circles
    const paint = Skia.Paint();
    paint.setStrokeWidth(5);
    paint.setColor(Skia.Color("yellow"));
    paint.setAntiAlias(true); // Make the circles smooth

    frame.render();
    // Detect landmarks
    const points: Points = detectVisionLandmarks(frame);
    if (!points.leftEye || !points.rightEye || !points.nose) {
      safeSetFeedBackText(
        "No face detetcted. Improve lighting or position face well",
      );
      return;
    }

    const eyeLevel =
      (orientation.value.startsWith("land")
        ? points.leftEyeCenter[0].y + points.rightEyeCenter[0].y
        : points.leftEyeCenter[0].x + points.rightEyeCenter[0].x) / 8;

    const height = frame.height / 4;
    const width = frame.width / 4;

    const resized = resize(frame, {
      scale: {
        width,
        height,
      },
      pixelFormat: "bgr",
      dataType: "uint8",
    });

    //get green points
    const greenPointsRects = getContourRectangles(
      height,
      width,
      resized,
      eyeLevel,
      orientation.value,
    );
    const greenPoints: Point[] = [];

    for (const rectangle of greenPointsRects) {
      greenPoints.push({ x: rectangle.x * 4, y: rectangle.y * 4 });

      frame.drawRect(
        {
          height: rectangle.height * 4,
          width: rectangle.width * 4,
          x: rectangle.x * 4,
          y: rectangle.y * 4,
        },
        paint,
      );
      // frame.drawCircle(rectangle.x * 4, rectangle.y * 4, 15, paint);
    }

    OpenCV.clearBuffers();

    safeSetFeedBackText("");

    paint.setColor(Skia.Color("blue"));
    // Draw circles at each point
    // const allPoints = [...points.leftEye, ...points.rightEye, ...points.nose];
    // for (const point of allPoints) {
    //   frame.drawCircle(point.x, point.y, 5, paint); // Draw a circle with a radius of 5
    // }

    paint.setColor(Skia.Color("purple"));
    const rightEyeCenter = points.rightEyeCenter[0];
    const leftEyeCenter = points.leftEyeCenter[0];
    const noseCenter = points.noseCenter[0];
    const noseLowerCenter = points.noseLowerCenter[0];
    const noseUpperCenter = points.noseUpperCenter[0];
    const boxArea = points.boundingBox[0].area;
    // console.log(points.nose);
    // for(const nosePoint of points.nose) {
    //   frame.drawCircle(nosePoint.x, nosePoint.y, 5, paint);
    // }
    // frame.drawCircle(rightEyeCenter.x, rightEyeCenter.y, 5, paint);
    // frame.drawCircle(leftEyeCenter.x, leftEyeCenter.y, 5, paint);
    // frame.drawCircle(noseCenter.x, noseCenter.y, 5, paint);
    // frame.drawCircle(noseLowerCenter.x, noseLowerCenter.y, 5, paint);
    // frame.drawCircle(noseUpperCenter.x, noseUpperCenter.y, 5, paint);
    paint.setColor(Skia.Color("green"));
    drawFacialTriangle(paint, frame, [
      leftEyeCenter,
      rightEyeCenter,
      noseLowerCenter,
    ]);

    greenPoints.sort((a, b) => a.y - b.y);

    // Calculate vectors from facial landmarks to each green point
    const relativeVectors = calculateRelativeVectors(
      greenPoints,
      leftEyeCenter,
      rightEyeCenter,
      noseLowerCenter,
    );

    if (sharedShouldCalibrate.value) {
      sharedShouldCalibrate.value = false;
      safeSetShowCalibrationModal(true);

      const cpoints = {
        rightEyeCenter,
        leftEyeCenter,
        noseCenter,
        noseLowerCenter,
        noseUpperCenter,
      };

      sharedCalibratedPoints.value = cpoints;
      sharedCalibratedBoxArea.value = boxArea;
      sharedRelativeVectors.value = relativeVectors;
    }

    if (sharedCalibratedPoints.value) {
      paint.setColor(Skia.Color("yellow"));

      const {
        leftEyeCenter: calibratedLeftEyeCenter,
        rightEyeCenter: calibratedRightEyeCenter,
        noseLowerCenter: calibratedNoseLowerCenter,
      } = sharedCalibratedPoints.value;

      drawFacialTriangle(paint, frame, [
        calibratedLeftEyeCenter,
        calibratedRightEyeCenter,
        calibratedNoseLowerCenter,
      ]);

      const isAligned = isFacialTriangleAligned(
        { leftEyeCenter, rightEyeCenter, noseLowerCenter },
        {
          leftEyeCenter: calibratedLeftEyeCenter,
          rightEyeCenter: calibratedRightEyeCenter,
          noseLowerCenter: calibratedNoseLowerCenter,
        },
      );

      if (greenPoints.length !== sharedRelativeVectors.value.length) {
        safeSetFaceAlignedText(
          isAligned
            ? "Facial triangle aligned. Incorrect number of markers detected."
            : "Align facial triangle. Incorrect number of markers detected.",
        );
      } else {
        const tiltDirections = getMarkerTiltDirections(
          greenPoints,
          sharedRelativeVectors.value,
          calibratedLeftEyeCenter,
          calibratedRightEyeCenter,
          calibratedNoseLowerCenter,
        );

        safeSetFaceAlignedText(
          isAligned
            ? tiltDirections.length > 0
              ? `Facial triangle aligned. Tilt helmet ${tiltDirections.join(" and ")}`
              : "All aligned"
            : "Align facial triangle",
        );
      }

      if (!sharedCalibratedBoxArea.value) {
        return;
      }
      // const threshold = 0.3;
      // const boxAreaRatio = boxArea / sharedCalibratedBoxArea.value;
      // const distanceFeedback = getDistanceFeedback(
      //   boxAreaRatio,
      //   threshold,
      //   feedbackText,
      // );
      // safeSetFeedBackText(distanceFeedback);

      // Draw points using relative vectors
      paint.setColor(Skia.Color("red"));
      drawVectorPoints(
        frame,
        paint,
        sharedRelativeVectors.value,
        leftEyeCenter,
        rightEyeCenter,
        noseLowerCenter,
      );
    }

    // console.log(points.leftPupil, points.rightPupil);
    // const leftPupil = points.leftPupil[0];
    // const rightPupil = points.rightPupil[0];
    // paint.setColor(Skia.Color("red"));
    // frame.drawCircle(leftPupil.x, leftPupil.y, 5, paint);
    // frame.drawCircle(rightPupil.x, rightPupil.y, 5, paint);
  }, []);

  if (!hasPermission)
    return <Button title="Request permission" onPress={requestPermission} />;
  if (device == null) return <Text>Camera not available</Text>;

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive
      frameProcessor={skiaFrameProcessor}
      format={format}
      onOutputOrientationChanged={(_orientation) =>
        (orientation.value = _orientation)
      }
    />
  );
}
