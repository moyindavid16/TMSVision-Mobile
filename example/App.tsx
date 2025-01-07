import { useState, useRef } from "react";
import {
  Button,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Camera,
  runAsync,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { FaceDetectionOptions } from "react-native-vision-camera-face-detector";
import { Worklets } from "react-native-worklets-core";

import { useVisionLandmarkDetector } from "./ios/VisionFrameProcessor/visionLandmarkDetector";
import { useLandmarkDetector } from "./ios/landmarkFrameProcessor/landmarkDetector";

interface Point {
  x: number;
  y: number;
}

export default function App() {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [show, setShow] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [visionPoints, setVisionPoints] = useState<{ x: number; y: number }[]>([]);

  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    // detection options
    landmarkMode: "all",
    performanceMode: "accurate",
  }).current;

  const { detectLandmarks } = useLandmarkDetector(faceDetectionOptions);
  const { detectVisionLandmarks } = useVisionLandmarkDetector();
  const screenWidth = Dimensions.get("screen").width;
  const screenHeight = Dimensions.get("screen").height;
  const scaleX = screenWidth / 1920;
  const scaleY = screenHeight / 1080;

  const handleDetectedLandmarks = Worklets.createRunOnJS((points: Point[]) => {
    const adjustedPoints = points.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }));
    // const flippedPoints = adjustedPoints.map(point => ({
    //   x: screenWidth - point.x,
    //   y: point.y,
    // }));
    setPoints(adjustedPoints);
  });

  const handleDetectVisionLandmarks = Worklets.createRunOnJS(
    (points: { leftEye: Point[]; rightEye: Point[]; nose: Point[] }) => {
      // Combine all points into one array
      const allPoints = [...points.leftEye, ...points.rightEye, ...points.nose];
      const adjustedPoints = allPoints.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }));
      // const flippedPoints = adjustedPoints.map(point => ({
      //   x: screenWidth - point.x,
      //   y: point.y,
      // }));
      // setPoints(adjustedPoints);

      // console.log(points);
      // console.log("detected points");

      setVisionPoints(adjustedPoints);
    },
  );
  // console.log(screenWidth, screenHeight, scaleX, scaleY);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      runAsync(frame, () => {
        "worklet";
        // const faces = detectFaces(frame);
        // ... chain some asynchronous frame processor
        // ... do something asynchronously with frame
        // handleDetectedFaces(faces);
        const landmarks = detectLandmarks(frame);
        // console.log("landmarksdsds", landmarks);
        // return;
        if (landmarks.length > 0) {
          // console.log(landmarks[0]);
          const points = Object.values(landmarks[0]) as Point[];
          handleDetectedLandmarks(points);
        }

        const visionLandmarks = detectVisionLandmarks(frame);
        handleDetectVisionLandmarks(visionLandmarks);
      });

      // ... chain frame processors
      // ... do something with frame
    },
    [handleDetectedLandmarks],
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
      {points.map((point, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "green",
            left: point.x,
            top: point.y,
            zIndex: 1000,
          }}
        />
      ))}

      {visionPoints.map((point, index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "purple",
            left: point.x,
            top: point.y,
            zIndex: 1000,
          }}
        />
      ))}

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={frameProcessor}
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
