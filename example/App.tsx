import { Skia } from "@shopify/react-native-skia";
import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useSkiaFrameProcessor,
} from "react-native-vision-camera";

import { useVisionLandmarkDetector } from "./ios/VisionFrameProcessor/visionLandmarkDetector";

interface Point {
  x: number;
  y: number;
}

export default function App() {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [show, setShow] = useState(false);

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

  const { detectVisionLandmarks } = useVisionLandmarkDetector();

  // Prepare paint for circles
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("blue")); // Set the circle color
  paint.setAntiAlias(true); // Make the circles smooth

  const skiaFrameProcessor = useSkiaFrameProcessor(
    (frame) => {
      "worklet";

      // Detect landmarks
      const points: { leftEye: Point[]; rightEye: Point[]; nose: Point[] } =
        detectVisionLandmarks(frame);
      frame.render();
      // console.log(frame.width, frame.height);

      // Draw circles at each point
      const allPoints = [...points.leftEye, ...points.rightEye, ...points.nose];
      for (const point of allPoints) {
        frame.drawCircle(point.x, point.y, 5, paint); // Draw a circle with a radius of 5
      }
    },
    [detectVisionLandmarks],
  );

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
