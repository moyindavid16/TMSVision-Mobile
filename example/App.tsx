import { Skia } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
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

import { drawFacialTriangle } from "./helpers/drawFacialTriangle";
import { getContourRectangles } from "./helpers/getContourRectangles";
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
  const sharedCalibratedPoints = useSharedValue<CalibratedPoints | null>(null);
  const sharedCalibratedBoxArea = useSharedValue<number | null>(null);
  const sharedShouldCalibrate = useSharedValue(false);

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

    getCalibratedPoints();
    getCalibratedBoxArea();
  }, []);

  const { resize } = useResizePlugin();
  const { detectVisionLandmarks } = useVisionLandmarkDetector();

  const safeSetFeedBackText = Worklets.createRunOnJS(setFeedbackText);
  const safeSetItem = Worklets.createRunOnJS(setItem);

  const skiaFrameProcessor = useSkiaFrameProcessor((frame) => {
    "worklet";
    // Prepare paint for circles
    const paint = Skia.Paint();
    paint.setStrokeWidth(3);
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

    const rectangles = getContourRectangles(height, width, resized);

    for (const rect of rectangles) {
      const rectangle = OpenCV.toJSValue(rect);

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
    const allPoints = [...points.leftEye, ...points.rightEye, ...points.nose];
    for (const point of allPoints) {
      frame.drawCircle(point.x, point.y, 5, paint); // Draw a circle with a radius of 5
    }

    paint.setColor(Skia.Color("purple"));
    const rightEyeCenter = points.rightEyeCenter[0];
    const leftEyeCenter = points.leftEyeCenter[0];
    const noseCenter = points.noseCenter[0];
    const noseLowerCenter = points.noseLowerCenter[0];
    const noseUpperCenter = points.noseUpperCenter[0];
    const boxArea = points.boundingBox[0].area;
    frame.drawCircle(rightEyeCenter.x, rightEyeCenter.y, 5, paint);
    frame.drawCircle(leftEyeCenter.x, leftEyeCenter.y, 5, paint);
    frame.drawCircle(noseCenter.x, noseCenter.y, 5, paint);
    frame.drawCircle(noseLowerCenter.x, noseLowerCenter.y, 5, paint);
    frame.drawCircle(noseUpperCenter.x, noseUpperCenter.y, 5, paint);
    paint.setColor(Skia.Color("green"));
    drawFacialTriangle(paint, frame, [
      leftEyeCenter,
      rightEyeCenter,
      noseLowerCenter,
    ]);

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
      sharedCalibratedPoints.value = cpoints;
      sharedCalibratedBoxArea.value = boxArea;
    }

    if (sharedCalibratedPoints.value) {
      const { leftEyeCenter, rightEyeCenter, noseLowerCenter } =
        sharedCalibratedPoints.value;
      paint.setColor(Skia.Color("yellow"));

      drawFacialTriangle(paint, frame, [
        leftEyeCenter,
        rightEyeCenter,
        noseLowerCenter,
      ]);

      if (!sharedCalibratedBoxArea.value) {
        return;
      }
      const threshold = 0.2;
      const boxAreaRatio = boxArea / sharedCalibratedBoxArea.value;
      if (
        boxAreaRatio > 1 + threshold &&
        feedbackText !== "Move farther away"
      ) {
        safeSetFeedBackText("Move farther away");
      } else if (
        boxAreaRatio < 1 - threshold &&
        feedbackText !== "Move closer"
      ) {
        safeSetFeedBackText("Move closer");
      }
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

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={skiaFrameProcessor}
        format={format}
      />
      {feedbackText && (
        <Text
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            fontSize: 30,
            paddingTop: 30,
            fontWeight: "semibold",
            color: "aqua",
          }}
        >
          {feedbackText}
        </Text>
      )}
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
    </View>
  );
}
