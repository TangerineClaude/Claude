# Privacy Redaction Tool

## Overview
Automatically remove PII (emails, phones, addresses, credit card digits) from text and images before sharing.

## Outcome
Share content confidently without exposing sensitive personal information. One-tap redaction for screenshots, documents, and text.

## MVP Features

### Core Functionality
- **PII Detection**: Automatically detect emails, phones, addresses, SSN, credit cards
- **Smart Redaction**: Replace with tokens or blur in images
- **Multiple Modes**: Blur, black box, pixelate, or replace with placeholder
- **Preview**: See redactions before exporting
- **Batch Processing**: Redact multiple files at once
- **Custom Patterns**: Add custom redaction patterns
- **Undo/Redo**: Adjust redactions before finalizing

### Privacy & Security
- On-device processing only
- No data uploaded to cloud
- No data collection
- Secure deletion of originals (optional)

## Tech Stack

### iOS
- **Language**: Swift/SwiftUI
- **OCR**: Vision framework for text detection in images
- **NER**: Create ML for named entity recognition
- **Image Processing**: Core Image for blurring/pixelation

### Android
- **Language**: Kotlin
- **OCR**: ML Kit
- **NER**: Custom TensorFlow Lite model
- **Image Processing**: RenderScript or OpenCV

### Backend (Optional)
- **API**: Python/FastAPI (for advanced NER model)
- **NER**: spaCy or transformers
- **Deployment**: Can run entirely on-device

## Architecture

```
┌─────────────────┐
│  Input Source   │
│ (Image/Text)    │
└────────┬────────┘
         │
    ┌────▼────┐
    │   OCR   │ (if image)
    │ Engine  │
    └────┬────┘
         │
    ┌────▼────┐
    │   PII   │
    │Detector │
    └────┬────┘
         │
    ┌────▼────┐
    │Redaction│
    │ Engine  │
    └────┬────┘
         │
    ┌────▼────┐
    │ Preview │
    │  View   │
    └────┬────┘
         │
    ┌────▼────┐
    │ Export  │
    └─────────┘
```

## Getting Started

### iOS Development

```bash
cd projects/privacy-redaction-tool/ios
open PrivacyRedactor.xcodeproj

# If using CocoaPods
pod install
```

### Configuration

```swift
// RedactionConfig.swift
struct RedactionConfig {
    // PII Types to detect
    var detectEmails = true
    var detectPhones = true
    var detectAddresses = true
    var detectSSN = true
    var detectCreditCards = true
    var detectNames = false  // Can produce false positives

    // Redaction style
    var redactionStyle: RedactionStyle = .blackBox

    // Custom patterns
    var customPatterns: [String] = []
}

enum RedactionStyle {
    case blur
    case blackBox
    case pixelate
    case placeholder(String)  // e.g., "[REDACTED]"
}
```

## PII Detection Patterns

### 1. Email Addresses
```swift
let emailPattern = #"[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}"#
```

### 2. Phone Numbers
```swift
let phonePatterns = [
    #"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"#,  // US: (123) 456-7890
    #"\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}"#  // International
]
```

### 3. Credit Cards
```swift
let creditCardPattern = #"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"#
```

### 4. Social Security Numbers
```swift
let ssnPattern = #"\b\d{3}-\d{2}-\d{4}\b"#
```

### 5. Addresses
```swift
// Complex pattern - use NER model
let addressIndicators = ["street", "st", "avenue", "ave", "road", "rd", "drive", "dr", "lane", "ln"]
```

## Implementation

### Text Redaction

```swift
// TextRedactor.swift
import Foundation
import NaturalLanguage

class TextRedactor {
    let config: RedactionConfig

    init(config: RedactionConfig) {
        self.config = config
    }

    func redact(text: String) -> RedactionResult {
        var redactedText = text
        var redactions: [Redaction] = []

        // Detect emails
        if config.detectEmails {
            let emailMatches = findMatches(in: text, pattern: emailPattern)
            for match in emailMatches {
                let range = match.range
                let original = String(text[range])
                let replacement = config.redactionStyle.textReplacement(for: original)
                redactions.append(Redaction(
                    type: .email,
                    range: range,
                    original: original,
                    replacement: replacement
                ))
            }
        }

        // Detect phones
        if config.detectPhones {
            for pattern in phonePatterns {
                let phoneMatches = findMatches(in: text, pattern: pattern)
                for match in phoneMatches {
                    let range = match.range
                    let original = String(text[range])
                    let replacement = config.redactionStyle.textReplacement(for: original)
                    redactions.append(Redaction(
                        type: .phone,
                        range: range,
                        original: original,
                        replacement: replacement
                    ))
                }
            }
        }

        // Apply redactions (in reverse order to maintain ranges)
        for redaction in redactions.sorted(by: { $0.range.lowerBound > $1.range.lowerBound }) {
            redactedText.replaceSubrange(redaction.range, with: redaction.replacement)
        }

        return RedactionResult(
            originalText: text,
            redactedText: redactedText,
            redactions: redactions
        )
    }

    private func findMatches(in text: String, pattern: String) -> [NSTextCheckingResult] {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let range = NSRange(text.startIndex..., in: text)
        return regex.matches(in: text, range: range)
    }
}

struct Redaction {
    let type: PIIType
    let range: Range<String.Index>
    let original: String
    let replacement: String
}

enum PIIType {
    case email
    case phone
    case address
    case ssn
    case creditCard
    case name
    case custom
}

struct RedactionResult {
    let originalText: String
    let redactedText: String
    let redactions: [Redaction]
}

extension RedactionStyle {
    func textReplacement(for original: String) -> String {
        switch self {
        case .blackBox, .blur, .pixelate:
            return String(repeating: "█", count: original.count)
        case .placeholder(let text):
            return text
        }
    }
}
```

### Image Redaction

```swift
// ImageRedactor.swift
import UIKit
import Vision
import CoreImage

class ImageRedactor {
    let config: RedactionConfig

    init(config: RedactionConfig) {
        self.config = config
    }

    func redact(image: UIImage, completion: @escaping (UIImage?, [Redaction]) -> Void) {
        // Step 1: Perform OCR
        recognizeText(in: image) { recognizedRegions in
            // Step 2: Detect PII in recognized text
            var redactions: [Redaction] = []

            for region in recognizedRegions {
                let textRedactor = TextRedactor(config: self.config)
                let result = textRedactor.redact(text: region.text)

                if !result.redactions.isEmpty {
                    // Map text redactions to image regions
                    redactions.append(contentsOf: result.redactions.map { textRedaction in
                        Redaction(
                            type: textRedaction.type,
                            imageRegion: region.boundingBox,
                            original: textRedaction.original,
                            replacement: textRedaction.replacement
                        )
                    })
                }
            }

            // Step 3: Apply redactions to image
            let redactedImage = self.applyRedactions(to: image, redactions: redactions)
            completion(redactedImage, redactions)
        }
    }

    private func recognizeText(in image: UIImage, completion: @escaping ([RecognizedRegion]) -> Void) {
        guard let cgImage = image.cgImage else {
            completion([])
            return
        }

        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else {
                completion([])
                return
            }

            let regions = observations.compactMap { observation -> RecognizedRegion? in
                guard let text = observation.topCandidates(1).first?.string else { return nil }
                return RecognizedRegion(text: text, boundingBox: observation.boundingBox)
            }

            completion(regions)
        }

        request.recognitionLevel = .accurate

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
    }

    private func applyRedactions(to image: UIImage, redactions: [Redaction]) -> UIImage? {
        guard let cgImage = image.cgImage else { return nil }

        let imageSize = CGSize(width: cgImage.width, height: cgImage.height)

        UIGraphicsBeginImageContext(imageSize)
        defer { UIGraphicsEndImageContext() }

        // Draw original image
        image.draw(in: CGRect(origin: .zero, size: imageSize))

        // Apply redactions
        let context = UIGraphicsGetCurrentContext()

        for redaction in redactions {
            let rect = convertVisionRectToImageRect(
                redaction.imageRegion,
                imageSize: imageSize
            )

            switch config.redactionStyle {
            case .blackBox:
                context?.setFillColor(UIColor.black.cgColor)
                context?.fill(rect)

            case .blur:
                if let croppedImage = cropImage(image, to: rect),
                   let blurredImage = applyBlur(to: croppedImage) {
                    blurredImage.draw(in: rect)
                }

            case .pixelate:
                if let croppedImage = cropImage(image, to: rect),
                   let pixelatedImage = applyPixelation(to: croppedImage) {
                    pixelatedImage.draw(in: rect)
                }

            case .placeholder(let text):
                context?.setFillColor(UIColor.black.cgColor)
                context?.fill(rect)
                let attrs: [NSAttributedString.Key: Any] = [
                    .foregroundColor: UIColor.white,
                    .font: UIFont.systemFont(ofSize: 12)
                ]
                (text as NSString).draw(in: rect, withAttributes: attrs)
            }
        }

        return UIGraphicsGetImageFromCurrentImageContext()
    }

    private func applyBlur(to image: UIImage) -> UIImage? {
        guard let ciImage = CIImage(image: image) else { return nil }

        let filter = CIFilter(name: "CIGaussianBlur")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(10.0, forKey: kCIInputRadiusKey)

        guard let output Image = filter?.outputImage else { return nil }
        let context = CIContext()
        guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else { return nil }

        return UIImage(cgImage: cgImage)
    }

    private func applyPixelation(to image: UIImage) -> UIImage? {
        guard let ciImage = CIImage(image: image) else { return nil }

        let filter = CIFilter(name: "CIPixellate")
        filter?.setValue(ciImage, forKey: kCIInputImageKey)
        filter?.setValue(12.0, forKey: kCIInputScaleKey)

        guard let outputImage = filter?.outputImage else { return nil }
        let context = CIContext()
        guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else { return nil }

        return UIImage(cgImage: cgImage)
    }

    private func cropImage(_ image: UIImage, to rect: CGRect) -> UIImage? {
        guard let cgImage = image.cgImage?.cropping(to: rect) else { return nil }
        return UIImage(cgImage: cgImage)
    }

    private func convertVisionRectToImageRect(_ visionRect: CGRect, imageSize: CGSize) -> CGRect {
        // Vision coordinates are normalized (0-1) with origin at bottom-left
        // UIKit coordinates have origin at top-left
        let x = visionRect.origin.x * imageSize.width
        let y = (1 - visionRect.origin.y - visionRect.height) * imageSize.height
        let width = visionRect.width * imageSize.width
        let height = visionRect.height * imageSize.height

        return CGRect(x: x, y: y, width: width, height: height)
    }
}

struct RecognizedRegion {
    let text: String
    let boundingBox: CGRect
}

extension Redaction {
    init(type: PIIType, imageRegion: CGRect, original: String, replacement: String) {
        self.type = type
        self.imageRegion = imageRegion
        self.original = original
        self.replacement = replacement
    }

    var imageRegion: CGRect {
        // Store in associated value or separate property
        return .zero
    }
}
```

## Features

### 1. Interactive Preview
- Show detected PII highlighted
- Toggle individual redactions on/off
- Adjust redaction style per item
- Undo/redo support

### 2. Batch Processing
```swift
func redactMultiple(images: [UIImage], completion: @escaping ([UIImage]) -> Void) {
    let group = DispatchGroup()
    var redacted: [UIImage] = []

    for image in images {
        group.enter()
        redact(image: image) { result, _ in
            if let result = result {
                redacted.append(result)
            }
            group.leave()
        }
    }

    group.notify(queue: .main) {
        completion(redacted)
    }
}
```

### 3. Export Options
- Save to Photos
- Share via share sheet
- Copy to clipboard
- Export as PDF
- Send via AirDrop

## Security Considerations

1. **Secure Deletion**: Overwrite original file data before deletion
2. **No Cloud Upload**: All processing on-device
3. **Memory Cleanup**: Clear sensitive data from memory
4. **No Logging**: Don't log detected PII
5. **Audit Trail**: Optional log of what was redacted (no original values)

## Testing

```bash
# iOS
xcodebuild test -scheme PrivacyRedactor

# Test accuracy with sample PII
```

## Roadmap

### Phase 1 (MVP) - 4 weeks
- [x] Email, phone, credit card detection
- [x] Black box redaction for text
- [x] Blur redaction for images
- [x] Share sheet integration
- [x] iOS app

### Phase 2 - 8 weeks
- [ ] SSN and address detection
- [ ] Custom pattern support
- [ ] Batch processing
- [ ] Multiple redaction styles
- [ ] Android app

### Phase 3 - 12 weeks
- [ ] PDF redaction
- [ ] Video redaction (face blurring)
- [ ] Advanced NER with ML
- [ ] Redaction templates
- [ ] Desktop app

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
