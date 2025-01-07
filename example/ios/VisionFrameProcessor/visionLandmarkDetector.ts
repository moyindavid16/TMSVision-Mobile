import { useMemo } from "react";
import { Frame, VisionCameraProxy } from "react-native-vision-camera";
import { FaceDetectionOptions } from "react-native-vision-camera-face-detector";

type LandmarkDetectorPlugin = {
  /**
   * Detect faces on frame
   *
   * @param {Frame} frame Frame to detect faces
   */
  detectVisionLandmarks: (frame: Frame) => any;
};

function createVisionLandmarkDetectorPlugin(): LandmarkDetectorPlugin {
  const plugin = VisionCameraProxy.initFrameProcessorPlugin(
    "detectVisionLandmarks",
    {},
  );

  if (!plugin) {
    throw new Error(
      'Failed to load Frame Processor Plugin "detectVisionLandmarks"!',
    );
  }

  return {
    detectVisionLandmarks: (frame: Frame) => {
      "worklet";
      // @ts-ignore
      return plugin.call(frame);
    },
  };
}

export function useVisionLandmarkDetector(): LandmarkDetectorPlugin {
  return useMemo(() => createVisionLandmarkDetectorPlugin(), []);
}
