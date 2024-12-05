import { useState } from "react";
import { Button, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import * as TMSVision from "tmsvision";

export default function App() {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const [show, setShow] = useState(false);
  // console.log("he;;o")

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    // console.log(`Frame: ${frame.width}x${frame.height} (${frame.pixelFormat})`);
    const som = frame.getNativeBuffer();
    const res = TMSVision.processFrame(som);
    // console.log(res);
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
        isActive={true}
        fps={1}
        frameProcessor={frameProcessor}
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
