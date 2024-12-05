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
    Function("processFrame") { (bufferRef: Int) -> String in
    // Convert the integer reference to a pointer
    guard let bufferPointer = UnsafeRawPointer(bitPattern: bufferRef) else {
        return "Error: Invalid buffer reference"
    }
    
    // Convert the pointer to a CVPixelBuffer
    let pixelBuffer = Unmanaged<CVPixelBuffer>.fromOpaque(bufferPointer).takeUnretainedValue()
    
    // Lock the base address of the pixel buffer
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    defer {
        CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)
    }

    let width = CVPixelBufferGetWidth(pixelBuffer)
    let height = CVPixelBufferGetHeight(pixelBuffer)

    // Return the processed result
    return "Frame dimensions: \(width)x\(height)"
    }
  }
}
