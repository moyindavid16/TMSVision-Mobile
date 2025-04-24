import { Picker } from "@react-native-picker/picker";
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
import {
  useCameraDevice,
  useCameraPermission,
} from "react-native-vision-camera";
import { useSharedValue, Worklets } from "react-native-worklets-core";

import CameraFeed from "./components/CameraFeed";
import { getItem, setItem } from "./utils/AsyncStorage";
import { CalibratedPoints } from "./utils/interfaces";

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

  const safeSetFeedBackText = Worklets.createRunOnJS(setFeedbackText);
  const safeSetFaceAlignedText = Worklets.createRunOnJS(setFaceAlignedText);
  const safeSetItem = Worklets.createRunOnJS(setItem);
  const safeSetShowCalibrationModal = Worklets.createRunOnJS(
    setShowCalibrationModal,
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

      <CameraFeed
        safeSetFaceAlignedText={safeSetFaceAlignedText}
        safeSetFeedBackText={safeSetFeedBackText}
        sharedCalibratedPoints={sharedCalibratedPoints}
        sharedCalibratedBoxArea={sharedCalibratedBoxArea}
        sharedShouldCalibrate={sharedShouldCalibrate}
        sharedRelativeVectors={sharedRelativeVectors}
        safeSetShowCalibrationModal={safeSetShowCalibrationModal}
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
