import ExpoModulesCore
import CoreVideo
import Foundation
import Vision

public class TmsvisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Tmsvision")

    Function("getTheme") { () -> String in
      "system"
    }

    // Simple function to get the width and height of a frame
    Function("processFrame") { (bufferData: Data) -> String in
      return "success"
      // // Ensure the Data object contains the necessary raw pointer
      // guard let rawPointer = bufferData.withUnsafeBytes({ $0.baseAddress }) else {
      //     return "Error: Invalid buffer data"
      // }
      
      // // Convert the raw pointer to a CVPixelBuffer
      // let pixelBuffer = Unmanaged<CVPixelBuffer>.fromOpaque(rawPointer).takeUnretainedValue()
      
      // // Lock the base address of the pixel buffer
      // CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
      // defer {
      //     CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)
      // }

      // // Get the frame dimensions
      // let width = CVPixelBufferGetWidth(pixelBuffer)
      // let height = CVPixelBufferGetHeight(pixelBuffer)

      // // Return the processed result as a string
      // return "Frame dimensions: \(width)x\(height)"
    }
  }
}
