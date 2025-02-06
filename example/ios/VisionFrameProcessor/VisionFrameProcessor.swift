import VisionCamera
import Vision

@objc(VisionFrameProcessorPlugin)
public class VisionFrameProcessorPlugin: FrameProcessorPlugin {
    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
        super.init(proxy: proxy, options: options)
    }

    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
        let buffer = frame.buffer

        // Create a dispatch group to synchronize the request
        let dispatchGroup = DispatchGroup()
        var landmarkDetectionResults: [String: [[String: CGFloat]]]? = nil
        var detectionError: Error? = nil

        // Perform the face landmark detection request
        let landmarkDetectionRequest = VNDetectFaceLandmarksRequest { request, error in
            self.handleLandmarkDetectionRequest(
                request: request,
                error: error
            ) { results, error in
                landmarkDetectionResults = results
                detectionError = error
                dispatchGroup.leave() // Signal completion
            }
        }

        // Configure and perform the request
      let landmarkRequestHandler = VNImageRequestHandler(cmSampleBuffer: buffer, orientation: .downMirrored)
        dispatchGroup.enter() // Enter the group before starting the request
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try landmarkRequestHandler.perform([landmarkDetectionRequest])
            } catch {
                detectionError = error
                dispatchGroup.leave()
            }
        }

        // Wait for the request to complete
        dispatchGroup.wait()

        // Return the results or error
        if let error = detectionError {
            print("Error during detection: \(error)")
            return ["error": error.localizedDescription]
        }

    //   return ["Fwidth": "\(frame.width)", "Fheight": "\(frame.height)"]
        return landmarkDetectionResults ?? ["error": "No results found"]
    }

    private func handleLandmarkDetectionRequest(
        request: VNRequest?,
        error: Error?,
        completion: @escaping ([String: [[String: CGFloat]]], Error?) -> Void
    ) {
        if let requestError = error {
            completion([:], requestError)
            return
        }

        guard let landmarkRequest = request as? VNDetectFaceLandmarksRequest,
              let results = landmarkRequest.results as? [VNFaceObservation],
              let faceObservation = results.first,
              let landmarks = faceObservation.landmarks else {
            completion([:], NSError(domain: "LandmarkDetection", code: 1, userInfo: [NSLocalizedDescriptionKey: "No landmarks detected"]))
            return
        }

        var landmarkDetectionResults: [String: [[String: CGFloat]]] = [:]
        let imageSize = CGSize(width: 2016, height: 1512) // Replace with your actual image size

        // Helper function to calculate the centroid
        func calculateCentroid(for points: [CGPoint]) -> CGPoint {
            let sum = points.reduce(CGPoint.zero) { (sum, point) in
                return CGPoint(x: sum.x + point.x, y: sum.y + point.y)
            }
            return CGPoint(x: sum.x / CGFloat(points.count), y: sum.y / CGFloat(points.count))
        }

        if let leftEye = landmarks.leftEye {
            let pointsInImage = leftEye.pointsInImage(imageSize: imageSize).map { $0 }
            let centroid = calculateCentroid(for: pointsInImage)
            landmarkDetectionResults["leftEye"] = pointsInImage.map { ["x": $0.x, "y": $0.y] }
            landmarkDetectionResults["leftEyeCenter"] = [["x": centroid.x, "y": centroid.y]]
        }

        if let rightEye = landmarks.rightEye {
            let pointsInImage = rightEye.pointsInImage(imageSize: imageSize).map { $0 }
            let centroid = calculateCentroid(for: pointsInImage)
            landmarkDetectionResults["rightEye"] = pointsInImage.map { ["x": $0.x, "y": $0.y] }
            landmarkDetectionResults["rightEyeCenter"] = [["x": centroid.x, "y": centroid.y]]
        }

        if let nose = landmarks.nose {
            let pointsInImage = nose.pointsInImage(imageSize: imageSize).map { $0 }
            let centroid = calculateCentroid(for: pointsInImage)
            landmarkDetectionResults["nose"] = pointsInImage.map { ["x": $0.x, "y": $0.y] }
            landmarkDetectionResults["noseCenter"] = [["x": centroid.x, "y": centroid.y]]
        }

        completion(landmarkDetectionResults, nil)
    }
}
