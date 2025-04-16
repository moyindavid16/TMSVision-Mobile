import { Picker } from "@react-native-picker/picker";
import { Skia } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

import { calculateRelativeVectors } from "./helpers/calculateRelativeVectors";
import { drawFacialTriangle } from "./helpers/drawFacialTriangle";
import { drawVectorPoints } from "./helpers/drawVectorPoints";
import { getContourRectangles } from "./helpers/getContourRectangles";
import { getDistanceFeedback } from "./helpers/getDistanceFeedback";
import { getMarkerTiltDirections } from "./helpers/getMarkerTiltDirections";
import { isFacialTriangleAligned } from "./helpers/isFacialTriangleAligned";
import { useVisionLandmarkDetector } from "./ios/VisionFrameProcessor/visionLandmarkDetector";
import { getItem, setItem } from "./utils/AsyncStorage";
import { CalibratedPoints, Point, Points } from "./utils/interfaces";

export default function App() {
  const device = useCameraDevice("front");
  const { hasPermission, requestPermission } = useCameraPermission();

  const [show, setShow] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [faceAlignedText, setFaceAlignedText] = useState("");
  const [calibrationId, setCalibrationId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [showCalibrationModal, setShowCalibrationModal] =
    useState<boolean>(false);

  const sharedCalibratedPoints = useSharedValue<CalibratedPoints | null>(null);
  const sharedCalibratedBoxArea = useSharedValue<number | null>(null);
  const sharedShouldCalibrate = useSharedValue(false);
  const sharedRelativeVectors = useSharedValue<{ x: number; y: number }[][]>(
    [],
  );

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

  // Modify resetCalibratedValues
  const resetCalibratedValues = async () => {
    if (!selectedId) return;
    const ids = availableIds.filter((id) => id !== selectedId);
    await setItem("calibrationIds", ids);
    await setItem(`calibratedPoints_${selectedId}`, null);
    await setItem(`boxArea_${selectedId}`, null);
    await setItem(`relativeVectors_${selectedId}`, null);
    sharedCalibratedPoints.value = null;
    sharedCalibratedBoxArea.value = null;
    sharedRelativeVectors.value = [];
    setAvailableIds(ids);
    setSelectedId(null);
  };

  const loadCalibrationData = async () => {
    const ids = (await getItem("calibrationIds")) || [];
    setAvailableIds(ids);

    if (selectedId) {
      const points = await getItem(`calibratedPoints_${selectedId}`);
      const area = await getItem(`boxArea_${selectedId}`);
      const vectors = await getItem(`relativeVectors_${selectedId}`);

      if (points) sharedCalibratedPoints.value = points;
      if (area) sharedCalibratedBoxArea.value = area;
      if (vectors) sharedRelativeVectors.value = vectors;
    } else {
      sharedCalibratedPoints.value = null;
      sharedCalibratedBoxArea.value = null;
      sharedRelativeVectors.value = [];
    }
  };
  // Replace the existing useEffect
  useEffect(() => {
    loadCalibrationData();
  }, [selectedId]);

  const handleCalibrationSave = async () => {
    if (!calibrationId || !sharedCalibratedPoints.value) return;

    const newIds = availableIds.includes(calibrationId)
      ? availableIds
      : [...availableIds, calibrationId];
    await setItem("calibrationIds", newIds);
    await setItem(
      `calibratedPoints_${calibrationId}`,
      sharedCalibratedPoints.value,
    );
    await setItem(`boxArea_${calibrationId}`, sharedCalibratedBoxArea.value);
    await setItem(
      `relativeVectors_${calibrationId}`,
      sharedRelativeVectors.value,
    );

    setAvailableIds(newIds);
    setSelectedId(calibrationId);
    setCalibrationId("");
    setShowCalibrationModal(false);
  };

  const { resize } = useResizePlugin();
  const { detectVisionLandmarks } = useVisionLandmarkDetector();

  const safeSetFeedBackText = Worklets.createRunOnJS(setFeedbackText);
  const safeSetFaceAlignedText = Worklets.createRunOnJS(setFaceAlignedText);
  const safeSetItem = Worklets.createRunOnJS(setItem);
  const safeSetShowCalibrationModal = Worklets.createRunOnJS(
    setShowCalibrationModal,
  );

  const skiaFrameProcessor = useSkiaFrameProcessor((frame) => {
    "worklet";
    // Prepare paint for circles
    const paint = Skia.Paint();
    paint.setStrokeWidth(5);
    paint.setColor(Skia.Color("yellow"));
    paint.setAntiAlias(true); // Make the circles smooth

    frame.render();

    // Detect landmarks
    const points: Points = detectVisionLandmarks(frame);
    if (!points.leftEye || !points.rightEye || !points.nose) {
      safeSetFeedBackText(
        "No face detetcted. Improve lighting or position face well",
      );
      return;
    }

    const eyeLevel =
      Math.min(points.leftEyeCenter[0].y, points.rightEyeCenter[0].y) / 4;
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

    //get green points
    const greenPointsRects = getContourRectangles(
      height,
      width,
      resized,
      eyeLevel,
    );
    const greenPoints: Point[] = [];

    for (const rectangle of greenPointsRects) {
      greenPoints.push({ x: rectangle.x * 4, y: rectangle.y * 4 });

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

    safeSetFeedBackText("");

    paint.setColor(Skia.Color("blue"));
    // Draw circles at each point
    // const allPoints = [...points.leftEye, ...points.rightEye, ...points.nose];
    // for (const point of allPoints) {
    //   frame.drawCircle(point.x, point.y, 5, paint); // Draw a circle with a radius of 5
    // }

    paint.setColor(Skia.Color("purple"));
    const rightEyeCenter = points.rightEyeCenter[0];
    const leftEyeCenter = points.leftEyeCenter[0];
    const noseCenter = points.noseCenter[0];
    const noseLowerCenter = points.noseLowerCenter[0];
    const noseUpperCenter = points.noseUpperCenter[0];
    const boxArea = points.boundingBox[0].area;
    // frame.drawCircle(rightEyeCenter.x, rightEyeCenter.y, 5, paint);
    // frame.drawCircle(leftEyeCenter.x, leftEyeCenter.y, 5, paint);
    // frame.drawCircle(noseCenter.x, noseCenter.y, 5, paint);
    // frame.drawCircle(noseLowerCenter.x, noseLowerCenter.y, 5, paint);
    // frame.drawCircle(noseUpperCenter.x, noseUpperCenter.y, 5, paint);
    paint.setColor(Skia.Color("green"));
    drawFacialTriangle(paint, frame, [
      leftEyeCenter,
      rightEyeCenter,
      noseLowerCenter,
    ]);

    greenPoints.sort((a, b) => a.y - b.y);

    // Calculate vectors from facial landmarks to each green point
    const relativeVectors = calculateRelativeVectors(
      greenPoints,
      leftEyeCenter,
      rightEyeCenter,
      noseLowerCenter,
    );

    if (sharedShouldCalibrate.value) {
      sharedShouldCalibrate.value = false;
      safeSetShowCalibrationModal(true);

      const cpoints = {
        rightEyeCenter,
        leftEyeCenter,
        noseCenter,
        noseLowerCenter,
        noseUpperCenter,
      };

      sharedCalibratedPoints.value = cpoints;
      sharedCalibratedBoxArea.value = boxArea;
      sharedRelativeVectors.value = relativeVectors;
    }

    if (sharedCalibratedPoints.value) {
      paint.setColor(Skia.Color("yellow"));

      const {
        leftEyeCenter: calibratedLeftEyeCenter,
        rightEyeCenter: calibratedRightEyeCenter,
        noseLowerCenter: calibratedNoseLowerCenter,
      } = sharedCalibratedPoints.value;

      drawFacialTriangle(paint, frame, [
        calibratedLeftEyeCenter,
        calibratedRightEyeCenter,
        calibratedNoseLowerCenter,
      ]);

      const isAligned = isFacialTriangleAligned(
        { leftEyeCenter, rightEyeCenter, noseLowerCenter },
        {
          leftEyeCenter: calibratedLeftEyeCenter,
          rightEyeCenter: calibratedRightEyeCenter,
          noseLowerCenter: calibratedNoseLowerCenter,
        },
      );

      if (greenPoints.length !== sharedRelativeVectors.value.length) {
        safeSetFaceAlignedText(
          isAligned
            ? "Facial triangle aligned. Incorrect number of markers detected."
            : "Align facial triangle. Incorrect number of markers detected.",
        );
      } else {
        const tiltDirections = getMarkerTiltDirections(
          greenPoints,
          sharedRelativeVectors.value,
          calibratedLeftEyeCenter,
          calibratedRightEyeCenter,
          calibratedNoseLowerCenter,
        );

        safeSetFaceAlignedText(
          isAligned
            ? tiltDirections.length > 0
              ? `Facial triangle aligned. Tilt helmet ${tiltDirections.join(" and ")}`
              : "All aligned"
            : "Align facial triangle",
        );
      }

      if (!sharedCalibratedBoxArea.value) {
        return;
      }
      const threshold = 0.3;
      const boxAreaRatio = boxArea / sharedCalibratedBoxArea.value;
      const distanceFeedback = getDistanceFeedback(
        boxAreaRatio,
        threshold,
        feedbackText,
      );
      // safeSetFeedBackText(distanceFeedback);

      // Draw points using relative vectors
      paint.setColor(Skia.Color("red"));
      drawVectorPoints(
        frame,
        paint,
        sharedRelativeVectors.value,
        leftEyeCenter,
        rightEyeCenter,
        noseLowerCenter,
      );
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

  const feedbackTexts = [feedbackText, faceAlignedText];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Modal visible={showCalibrationModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            value={calibrationId}
            onChangeText={(text) => setCalibrationId(text)}
            placeholder="Enter calibration ID"
          />
          <Button title="Save" onPress={handleCalibrationSave} />
          <Button
            title="Cancel"
            onPress={() => (
              setShowCalibrationModal(false),
              setCalibrationId(""),
              loadCalibrationData()
            )}
          />
        </View>
      </Modal>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedId}
          onValueChange={(value) => setSelectedId(value)}
          style={styles.picker}
        >
          <Picker.Item label="Select Profile" value="" />
          {availableIds.map((id) => (
            <Picker.Item key={id} label={id} value={id} />
          ))}
        </Picker>
      </View>

      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={skiaFrameProcessor}
        format={format}
      />

      {feedbackTexts.map((text, i) => (
        <Text key={text + i} style={styles.feedbackText}>
          {text}
        </Text>
      ))}

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

      <View
        style={{
          position: "absolute",
          bottom: 100,
          right: 100,
          flexDirection: "row",
          gap: 10,
          zIndex: 1000,
        }}
      >
        <Pressable
          style={{
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

        <Pressable
          style={{
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            backgroundColor: "red",
            borderRadius: 10,
            padding: 15,
          }}
          onPress={resetCalibratedValues}
        >
          <Text style={{ zIndex: 1000, color: "white", fontWeight: "bold" }}>
            Reset
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  feedbackText: {
    zIndex: 1000,
    fontSize: 30,
    fontWeight: "bold",
    color: "red",
    paddingHorizontal: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  input: {
    width: "80%",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  pickerContainer: {
    position: "absolute",
    top: 100,
    right: 20,
    zIndex: 9999,
  },
  picker: {
    width: 150,
    backgroundColor: "white",
    borderRadius: 5,
  },
});
