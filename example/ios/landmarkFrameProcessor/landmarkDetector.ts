import { useMemo } from "react";
import { Frame, VisionCameraProxy } from "react-native-vision-camera";
import { FaceDetectionOptions } from "react-native-vision-camera-face-detector";

type LandmarkDetectorPlugin = {
  /**
   * Detect faces on frame
   *
   * @param {Frame} frame Frame to detect faces
   */
  detectLandmarks: (frame: Frame) => any;
};

function createLandmarkDetectorPlugin(
  options?: FaceDetectionOptions,
): LandmarkDetectorPlugin {
  const plugin = VisionCameraProxy.initFrameProcessorPlugin("detectLandmarks", {
    ...options,
  });

  if (!plugin) {
    throw new Error('Failed to load Frame Processor Plugin "detectFaces"!');
  }

  return {
    detectLandmarks: (frame: Frame) => {
      "worklet";
      // @ts-ignore
      return plugin.call(frame);
    },
  };
}

export function useLandmarkDetector(
  options?: FaceDetectionOptions,
): LandmarkDetectorPlugin {
  return useMemo(() => createLandmarkDetectorPlugin(options), [options]);
}
