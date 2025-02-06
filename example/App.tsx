import { Skia } from "@shopify/react-native-skia";
import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import { OpenCV } from "react-native-fast-opencv";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useSkiaFrameProcessor,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";

import { getContourRectangles } from "./helpers/getContourRectangles";
import { useVisionLandmarkDetector } from "./ios/VisionFrameProcessor/visionLandmarkDetector";

interface Point {
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
}

export default function App() {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [show, setShow] = useState(false);
  const [detectError, setDetectError] = useState(false);

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
      // console.log("Unable to detect a face. Improve lighting or position face well");
      // const font = Skia.Font(undefined, 18);
      // frame.drawText(
      //   "Unable to detect a face. Improve lighting or position face well",
      //   100,
      //   100,
      //   paint,
      //   font,
      // );
      return;
    }

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
    frame.drawCircle(rightEyeCenter.x, rightEyeCenter.y, 5, paint);
    frame.drawCircle(leftEyeCenter.x, leftEyeCenter.y, 5, paint);
    frame.drawCircle(noseCenter.x, noseCenter.y, 5, paint);
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
    <View style={{ flex: 1 }}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={skiaFrameProcessor}
        format={format}
      />
      {detectError && (
        <Text
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            position: "absolute",
            top: 100,
            left: 100,
            fontSize: 60,
          }}
        >
          No face detetcted. Improve lighting or position face well.{" "}
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
    </View>
  );
}
