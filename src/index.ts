// Import the native module. On web, it will be resolved to Tmsvision.web.ts
// and on native platforms to Tmsvision.ts
import TmsvisionModule from "./TmsvisionModule";
// import { Frame } from 'react-native-vision-camera';

export function getTheme(): string {
  return TmsvisionModule.getTheme();
}

export const processFrame = (frame) => {
  "worklet";

  // const result = TmsvisionModule.getTheme();
  const result = TmsvisionModule.processFrame(frame);
  // try {
  //   console.log("Processing frame...");
  //   // const result = TmsvisionModule.processFrame(p);
  //   console.log("Frame processing result:", result);
  // } catch (error) {
  //   console.error("Error processing frame:", error);
  // }
  return result;
};
