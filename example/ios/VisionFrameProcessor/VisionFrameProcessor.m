#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("tmsvisionexample/tmsvisionexample-Swift.h")
#import "tmsvisionexample/tmsvisionexample-Swift.h"
#else
#import "tmsvisionexample-Swift.h"
#endif

VISION_EXPORT_SWIFT_FRAME_PROCESSOR(VisionFrameProcessorPlugin, detectVisionLandmarks)