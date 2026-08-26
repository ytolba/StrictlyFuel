import Foundation
import Vision
import UIKit

@objc(StrictlyOCR)
final class StrictlyOCR: NSObject {
  @objc
  func recognizeText(
    _ imagePath: NSString,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let path = imagePath as String

    // Expo/ImageManipulator returns local images as `file://` URLs while
    // UIImage(contentsOfFile:) expects a filesystem path. Normalize both
    // forms so Vision can open compressed camera captures reliably.
    let filesystemPath: String
    if let url = URL(string: path), url.isFileURL {
      filesystemPath = url.path
    } else {
      filesystemPath = path
    }

    guard let image = UIImage(contentsOfFile: filesystemPath), let cgImage = image.cgImage else {
      reject("OCR_IMAGE_ERROR", "The captured image could not be opened.", nil)
      return
    }

    let request = VNRecognizeTextRequest { request, error in
      if let error {
        reject("OCR_REQUEST_ERROR", error.localizedDescription, error)
        return
      }

      let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
      let text = observations
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n")
        .trimmingCharacters(in: .whitespacesAndNewlines)

      if text.isEmpty {
        reject("OCR_NO_TEXT", "No readable text was found in the image.", nil)
      } else {
        resolve(text)
      }
    }

    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["en-US"]

    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
      } catch {
        reject("OCR_HANDLER_ERROR", error.localizedDescription, error)
      }
    }
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }
}
