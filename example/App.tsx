import { useEffect, useState, useRef } from "react";
import { Button, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Frame,
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import {
  Face,
  Camera,
  FaceDetectionOptions,
} from "react-native-vision-camera-face-detector";
import * as TMSVision from "tmsvision";

export default function App() {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [show, setShow] = useState(false);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  // console.log("he;;o")

  // const frameProcessor = useFrameProcessor((frame) => {
  //   "worklet";
  //   // console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`);
  //   // const som = new Uint8Array(frame.toArrayBuffer());
  //   const som = new Uint8Array([0]);
  //   const res = TMSVision.processFrame(frame);
  //   console.log("kejh", res);
  // }, []);

  const faceDetectionOptions = useRef<FaceDetectionOptions>({
    // detection options
    landmarkMode: "all",
    performanceMode: "accurate",
    windowHeight: Dimensions.get("screen").height,
    windowWidth: Dimensions.get("screen").width,
    autoScale: true,
  }).current;

  // const device = useCameraDevice('front')

  function handleFacesDetection(faces: Face[], frame: Frame) {
    if (faces.length > 0) {
      // console.log("faces", faces.length, "frame", frame.toString());
      // console.log(faces[0].landmarks);
      const leftEye = faces[0].landmarks.LEFT_EYE;
      const rightEye = faces[0].landmarks.RIGHT_EYE;
      const nose = faces[0].landmarks.NOSE_BASE;
      console.log({ leftEye, rightEye, nose });
      setPoints([leftEye, rightEye, nose]);
    }
  }

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

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        faceDetectionCallback={handleFacesDetection}
        faceDetectionOptions={faceDetectionOptions}
        fps={10}
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
