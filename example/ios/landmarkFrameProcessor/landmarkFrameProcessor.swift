import VisionCamera
import MLKit
import UIKit
//import ExpoConstants
//import UIUtilities

@objc(landmarkFrameProcessorPlugin)
public class landmarkFrameProcessorPlugin: FrameProcessorPlugin {
  public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
    super.init(proxy: proxy, options: options)
  }

  // Determine the image orientation based on the device orientation and camera position
    private func imageOrientation(
        deviceOrientation: UIDeviceOrientation,
        cameraPosition: AVCaptureDevice.Position
    ) -> UIImage.Orientation {
        switch deviceOrientation {
        case .portrait:
            return cameraPosition == .front ? .leftMirrored : .right
        case .landscapeLeft:
            return cameraPosition == .front ? .downMirrored : .up
        case .portraitUpsideDown:
            return cameraPosition == .front ? .rightMirrored : .left
        case .landscapeRight:
            return cameraPosition == .front ? .upMirrored : .down
        case .faceDown, .faceUp, .unknown:
            return .up
        }
    }

   public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
       // Access frame buffer and orientation
      let sampleBuffer = frame.buffer

       // Ensure the camera position is provided
      //  guard let cameraPositionRaw = arguments?["cameraPosition"] as? Int,
      //        let cameraPosition = AVCaptureDevice.Position(rawValue: cameraPositionRaw) else {
      //      print("Error: Camera position is missing or invalid")
      //      return nil
      //  }

       // Create a VisionImage
       let visionImage = VisionImage(buffer: sampleBuffer)
       visionImage.orientation = imageOrientation(
           deviceOrientation: UIDevice.current.orientation,
           cameraPosition: .back
       )

       // Perform your custom processing here
       // Example: Log the frame size
      //  print("Processing frame with size: \(frame.width)x\(frame.height)")
     // Configure FaceDetectorOptions
        let options = FaceDetectorOptions()
        options.performanceMode = .accurate
        options.landmarkMode = .all
        options.classificationMode = .all

        // Create FaceDetector
        let faceDetector = FaceDetector.faceDetector(options: options)

        // Perform face detection
        var faceDetectionResults: [[String: Any]] = []
        do {
            let faces = try faceDetector.results(in: visionImage)
            for face in faces {
                // Example: Collect face attributes
              var faceData: [String: Any] = [:
                  ]
                  // Add left eye position if available 
                if let leftEye = face.landmark(ofType: .leftEye) {
                    faceData["leftEyePosition"] = ["x": leftEye.position.x, "y": leftEye.position.y]
                    // faceData["frame"] = ["x": frame.width, "y": frame.height]
                    // faceData["faceFrame"] = ["x": face.frame.origin.x, "y": face.frame.origin.y, "width": face.frame.width, "height": face.frame.height]
                }
                
                // Add nose base position if available
                if let noseBase = face.landmark(ofType: .noseBase) {
                    faceData["noseBasePosition"] = ["x": noseBase.position.x, "y": noseBase.position.y]
                }
                
                // Add right eye position if available
                if let rightEye = face.landmark(ofType: .rightEye) {
                    faceData["rightEyePosition"] = ["x": rightEye.position.x, "y": rightEye.position.y]
                }
                faceDetectionResults.append(faceData)
            }
        } catch {
            print("Face detection failed: \(error.localizedDescription)")
            return nil
        }
       return faceDetectionResults
      //  return "Processing frame with size: \(frame.width)x\(frame.height)"
   }

  //  public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
  //    let buffer = frame.buffer
  //    let orientation = frame.orientation
  //    let image = VisionImage(buffer: buffer)
  //   image.orientation = imageOrientation(
  //      deviceOrientation: UIDevice.current.orientation,
  //      cameraPosition: cameraPosition)
  //    // code goes here
  //    return "communication"
  //  }

}


      
