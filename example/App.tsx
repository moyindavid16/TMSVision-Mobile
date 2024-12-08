import { useEffect, useState, useRef } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
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
  }).current;

  // const device = useCameraDevice('front')

  function handleFacesDetection(faces: Face[], frame: Frame) {
    if(faces.length>0){
      // console.log("faces", faces.length, "frame", frame.toString());
      console.log(faces[0].landmarks);
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
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        faceDetectionCallback={handleFacesDetection}
        faceDetectionOptions={faceDetectionOptions}
      />
      <Pressable
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        onPress={() => setShow(false)}
      >
        <Text>Press to end</Text>
      </Pressable>
    </View>
  );
}
