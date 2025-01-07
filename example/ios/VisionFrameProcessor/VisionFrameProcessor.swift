import VisionCamera
import Vision

@objc(VisionFrameProcessorPlugin)
public class VisionFrameProcessorPlugin: FrameProcessorPlugin {
  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
    super.init(proxy: proxy, options: options)
  }

  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
    let buffer = frame.buffer
    let orientation = frame.orientation

    let landmarkDetectionRequest = VNDetectFaceLandmarksRequest(completionHandler: self.handleLandmarkDetectionRequest)
    let landmarkRequestHandler = VNImageRequestHandler(cmSampleBuffer: buffer, orientation: .up)
    
    // code goes here
    return "communiciation"
  }
  
  private func handleLandmarkDetectionRequest(request: VNRequest?, error: Error?) {
    if let requestError = error {
      print("Error: \(requestError)")
      return
    }
    
    guard let landmarkRequest = request as? VNDetectFaceLandmarksRequest,
          let results = landmarkRequest.results as? [VNFaceObservation],
          let faceObservation = results.first,
          let landmarks = faceObservation.landmarks else {
        print("No landmarks detected.")
        return
    }
    
    var landmarkDetectionResults: [String: Any] = [:]
    // Define the image size (you must provide the actual image size)
    let imageSize = CGSize(width: 1920, height: 1080) // Replace with your actual image size

    if let leftEye = landmarks.leftEye {
//        print("Left Eye Landmarks: \(leftEye.normalizedPoints)")
      landmarkDetectionResults["leftEye"] = leftEye.pointsInImage(imageSize: imageSize)
    }
    if let rightEye = landmarks.rightEye {
//        print("Right Eye Landmarks: \(rightEye.normalizedPoints)")
    }
    if let nose = landmarks.nose {
//        print("Nose Landmarks: \(nose.normalizedPoints)")
    }
    print("Landmark Detection Results: \(landmarkDetectionResults)")
    
//    return landmarkDetectionResults
    
  }
}
