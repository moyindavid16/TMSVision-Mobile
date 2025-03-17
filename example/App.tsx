import { Skia } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import {
  Button,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { OpenCV } from "react-native-fast-opencv";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useSkiaFrameProcessor,
} from "react-native-vision-camera";
import { useSharedValue, Worklets } from "react-native-worklets-core";
import { useResizePlugin } from "vision-camera-resize-plugin";

import { calculateRelativeVectors } from "./helpers/calculateRelativeVectors";
import { drawFacialTriangle } from "./helpers/drawFacialTriangle";
import { drawVectorPoints } from "./helpers/drawVectorPoints";
import { getContourRectangles } from "./helpers/getContourRectangles";
import { getDistanceFeedback } from "./helpers/getDistanceFeedback";
import { isFacialTriangleAligned } from "./helpers/isFacialTriangleAligned";
import { useVisionLandmarkDetector } from "./ios/VisionFrameProcessor/visionLandmarkDetector";
import { getItem, setItem } from "./utils/AsyncStorage";

export interface Point {
  x: number;
  y: number;
}

interface Points {
  leftEye: Point[];
  rightEye: Point[];
  nose: Point[];
  leftEyeCenter: Point[];
  rightEyeCenter: Point[];
  noseCenter: Point[];
  noseLowerCenter: Point[];
  noseUpperCenter: Point[];
  leftPupil: Point[];
  rightPupil: Point[];
  boundingBox: { area: number }[];
}

interface CalibratedPoints {
  leftEyeCenter: Point;
  rightEyeCenter: Point;
  noseCenter: Point;
  noseLowerCenter: Point;
  noseUpperCenter: Point;
}

export default function App() {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [show, setShow] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [faceAlignedText, setFaceAlignedText] = useState("");
  const sharedCalibratedPoints = useSharedValue<CalibratedPoints | null>(null);
  const sharedCalibratedBoxArea = useSharedValue<number | null>(null);
  const sharedShouldCalibrate = useSharedValue(false);
  const sharedRelativeVectors = useSharedValue<{ x: number; y: number }[][]>(
    [],
  );

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

  useEffect(() => {
    const getCalibratedPoints = async () => {
      const points = await getItem("calibratedPoints");
      if (points) {
        sharedCalibratedPoints.value = points;
      }
    };

    const getCalibratedBoxArea = async () => {
      const area = await getItem("boxArea");
      if (area) {
        sharedCalibratedBoxArea.value = area;
      }
    };

    const getRelativeVectors = async () => {
      const vectors = await getItem("relativeVectors");
      if (vectors) {
        sharedRelativeVectors.value = vectors;
      }
    };

    getCalibratedPoints();
    getCalibratedBoxArea();
    getRelativeVectors();
  }, []);

  const { resize } = useResizePlugin();
  const { detectVisionLandmarks } = useVisionLandmarkDetector();

  const safeSetFeedBackText = Worklets.createRunOnJS(setFeedbackText);
  const safeSetFaceAlignedText = Worklets.createRunOnJS(setFaceAlignedText);
  const safeSetItem = Worklets.createRunOnJS(setItem);

  const skiaFrameProcessor = useSkiaFrameProcessor((frame) => {
    "worklet";
    // Prepare paint for circles
    const paint = Skia.Paint();
    paint.setStrokeWidth(5);
    paint.setColor(Skia.Color("yellow"));
    paint.setAntiAlias(true); // Make the circles smooth

    frame.render();

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
    const greenPointsRects = getContourRectangles(height, width, resized);
    const greenPoints: Point[] = [];

    for (const rect of greenPointsRects) {
      const rectangle = OpenCV.toJSValue(rect);
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
    }

    OpenCV.clearBuffers();

    // Detect landmarks
    const points: Points = detectVisionLandmarks(frame);
    if (!points.leftEye || !points.rightEye || !points.nose) {
      safeSetFeedBackText(
        "No face detetcted. Improve lighting or position face well",
      );
      return;
    }

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

      const cpoints = {
        rightEyeCenter,
        leftEyeCenter,
        noseCenter,
        noseLowerCenter,
        noseUpperCenter,
      };

      safeSetItem("calibratedPoints", cpoints);
      safeSetItem("boxArea", boxArea);
      safeSetItem("relativeVectors", relativeVectors);
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

      const triangleThreshold = 0.05;

      const isAligned = isFacialTriangleAligned(
        { leftEyeCenter, rightEyeCenter, noseLowerCenter },
        {
          leftEyeCenter: calibratedLeftEyeCenter,
          rightEyeCenter: calibratedRightEyeCenter,
          noseLowerCenter: calibratedNoseLowerCenter,
        },
        triangleThreshold,
      );

      safeSetFaceAlignedText(
        isAligned ? "Facial triangle aligned" : "Align facial triangle",
      );

      if (!sharedCalibratedBoxArea.value) {
        return;
      }
      const threshold = 0.1;
      const boxAreaRatio = boxArea / sharedCalibratedBoxArea.value;
      const distanceFeedback = getDistanceFeedback(
        boxAreaRatio,
        threshold,
        feedbackText,
      );
      safeSetFeedBackText(distanceFeedback);

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
  if (!show) {
    return (
      <Pressable
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        onPress={() => setShow(true)}
      >
        <Text>Press to start</Text>
      </Pressable>
    );
  }

  const feedbackTexts = [feedbackText, faceAlignedText];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={skiaFrameProcessor}
        format={format}
      />

      {feedbackTexts.map((text) => (
        <Text style={styles.feedbackText}>{text}</Text>
      ))}

      <Pressable
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
        onPress={() => setShow(false)}
      >
        <Text style={{ zIndex: 1000 }}>Press to end</Text>
      </Pressable>

      <Pressable
        style={{
          position: "absolute",
          bottom: 100,
          right: 100,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          backgroundColor: "black",
          borderRadius: 10,
          padding: 15,
        }}
        onPress={() => (sharedShouldCalibrate.value = true)}
      >
        <Text style={{ zIndex: 1000, color: "white", fontWeight: "bold" }}>
          Calibrate
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  feedbackText: {
    zIndex: 1000,
    fontSize: 30,
    fontWeight: "bold",
    color: "red",
    paddingHorizontal: 10,
  },
});
