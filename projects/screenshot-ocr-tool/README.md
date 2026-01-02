# Long Screenshot OCR + Link Opener

## Overview
Extract text from tall screenshots and automatically detect and open TikTok, YouTube, and other social media links directly.

## Outcome
Never manually type out text from screenshots again. Instantly extract text, detect links, and open them with one tap.

## MVP Features

### Core Functionality
- **OCR Processing**: Extract text from images (even very long screenshots)
- **Link Detection**: Identify URLs, especially TikTok, YouTube, Instagram, Twitter
- **One-Tap Open**: Open detected links directly in apps
- **Text Export**: Copy extracted text to clipboard
- **Multi-Language Support**: OCR for multiple languages
- **Share Sheet Integration**: Process images from any app
- **History**: Keep recent OCR results

### Privacy & Security
- On-device processing (no cloud upload)
- No data collection
- No analytics
- Local storage only

## Tech Stack

### iOS
- **Language**: Swift/SwiftUI
- **OCR**: Vision framework (on-device)
- **UI**: SwiftUI + UIKit for share extension
- **Storage**: Core Data or UserDefaults

### Android
- **Language**: Kotlin
- **OCR**: ML Kit (on-device) or Tesseract
- **UI**: Jetpack Compose
- **Storage**: Room database

### Cross-Platform (Alternative)
- **Framework**: React Native or Flutter
- **OCR**: react-native-vision-camera + ML Kit
- **Storage**: AsyncStorage or SQLite

## Architecture

```
┌─────────────────────┐
│   Share Sheet       │
│  (iOS/Android)      │
└──────────┬──────────┘
           │
      ┌────▼────┐
      │  Image  │
      │ Picker  │
      └────┬────┘
           │
      ┌────▼────┐
      │   OCR   │
      │ Engine  │
      │(Vision/ │
      │ ML Kit) │
      └────┬────┘
           │
      ┌────▼────┐
      │  Text   │
      │Processor│
      └────┬────┘
           │
      ┌────▼────────┐
      │Link Detector│
      └────┬────────┘
           │
      ┌────▼────┐
      │ Result  │
      │  View   │
      └─────────┘
```

## Getting Started

### iOS Development

```bash
# Prerequisites
- Xcode 15+
- iOS 15+

# Setup
cd projects/screenshot-ocr-tool/ios
open ScreenshotOCR.xcodeproj

# Install dependencies (if using CocoaPods)
pod install
```

### Android Development

```bash
# Prerequisites
- Android Studio Hedgehog+
- Android SDK 26+

# Setup
cd projects/screenshot-ocr-tool/android
./gradlew build
```

## Key Features Implementation

### 1. Share Sheet Extension (iOS)

```swift
// ShareViewController.swift
import UIKit
import Vision

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachment = item.attachments?.first else { return }

        if attachment.hasItemConformingToTypeIdentifier("public.image") {
            attachment.loadItem(forTypeIdentifier: "public.image") { data, error in
                if let url = data as? URL, let image = UIImage(contentsOfFile: url.path) {
                    self.performOCR(on: image)
                } else if let image = data as? UIImage {
                    self.performOCR(on: image)
                }
            }
        }
    }

    func performOCR(on image: UIImage) {
        guard let cgImage = image.cgImage else { return }

        let request = VNRecognizeTextRequest { request, error in
            guard let observations = request.results as? [VNRecognizedTextObservation] else { return }

            let recognizedText = observations.compactMap { observation in
                observation.topCandidates(1).first?.string
            }.joined(separator: "\n")

            DispatchQueue.main.async {
                self.processText(recognizedText)
            }
        }

        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
    }

    func processText(_ text: String) {
        let links = detectLinks(in: text)
        showResults(text: text, links: links)
    }
}
```

### 2. Link Detection

```swift
// LinkDetector.swift
import Foundation

class LinkDetector {
    static func detect(in text: String) -> [DetectedLink] {
        var links: [DetectedLink] = []

        // Detect URLs
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        detector?.enumerateMatches(in: text, range: NSRange(text.startIndex..., in: text)) { match, _, _ in
            if let match = match, let url = match.url {
                let type = identifyLinkType(url)
                links.append(DetectedLink(url: url, type: type))
            }
        }

        // Detect @mentions and #hashtags for social media
        let patterns = [
            "(?:@)(\\w+)",  // Twitter/Instagram mentions
            "(?:#)(\\w+)"   // Hashtags
        ]

        // Add more sophisticated pattern matching...

        return links
    }

    static func identifyLinkType(_ url: URL) -> LinkType {
        let host = url.host?.lowercased() ?? ""

        if host.contains("tiktok.com") || host.contains("vm.tiktok.com") {
            return .tiktok
        } else if host.contains("youtube.com") || host.contains("youtu.be") {
            return .youtube
        } else if host.contains("instagram.com") {
            return .instagram
        } else if host.contains("twitter.com") || host.contains("x.com") {
            return .twitter
        } else {
            return .generic
        }
    }
}

enum LinkType {
    case tiktok
    case youtube
    case instagram
    case twitter
    case generic
}

struct DetectedLink {
    let url: URL
    let type: LinkType
}
```

### 3. Result View

```swift
// ResultView.swift
import SwiftUI

struct ResultView: View {
    let text: String
    let links: [DetectedLink]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Detected Links Section
                if !links.isEmpty {
                    Section {
                        ForEach(links, id: \.url) { link in
                            LinkButton(link: link)
                        }
                    } header: {
                        Text("Detected Links (\(links.count))")
                            .font(.headline)
                    }
                }

                // Full Text Section
                Section {
                    Text(text)
                        .textSelection(.enabled)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                } header: {
                    HStack {
                        Text("Extracted Text")
                            .font(.headline)
                        Spacer()
                        Button("Copy") {
                            UIPasteboard.general.string = text
                        }
                    }
                }
            }
            .padding()
        }
    }
}

struct LinkButton: View {
    let link: DetectedLink

    var body: some View {
        Button(action: { openLink(link) }) {
            HStack {
                Image(systemName: iconForLinkType(link.type))
                    .foregroundColor(colorForLinkType(link.type))
                VStack(alignment: .leading) {
                    Text(link.type.displayName)
                        .font(.headline)
                    Text(link.url.absoluteString)
                        .font(.caption)
                        .lineLimit(1)
                }
                Spacer()
                Image(systemName: "arrow.up.right")
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
    }

    func openLink(_ link: DetectedLink) {
        UIApplication.shared.open(link.url)
    }

    func iconForLinkType(_ type: LinkType) -> String {
        switch type {
        case .tiktok: return "music.note"
        case .youtube: return "play.rectangle"
        case .instagram: return "camera"
        case .twitter: return "bird"
        case .generic: return "link"
        }
    }

    func colorForLinkType(_ type: LinkType) -> Color {
        switch type {
        case .tiktok: return .black
        case .youtube: return .red
        case .instagram: return .purple
        case .twitter: return .blue
        case .generic: return .gray
        }
    }
}

extension LinkType {
    var displayName: String {
        switch self {
        case .tiktok: return "TikTok"
        case .youtube: return "YouTube"
        case .instagram: return "Instagram"
        case .twitter: return "Twitter/X"
        case .generic: return "Web Link"
        }
    }
}
```

### 4. History Storage

```swift
// HistoryManager.swift
import Foundation

class HistoryManager {
    static let shared = HistoryManager()

    private let historyKey = "ocr_history"
    private let maxHistoryItems = 50

    func save(result: OCRResult) {
        var history = getHistory()
        history.insert(result, at: 0)

        // Limit history size
        if history.count > maxHistoryItems {
            history = Array(history.prefix(maxHistoryItems))
        }

        if let data = try? JSONEncoder().encode(history) {
            UserDefaults.standard.set(data, forKey: historyKey)
        }
    }

    func getHistory() -> [OCRResult] {
        guard let data = UserDefaults.standard.data(forKey: historyKey),
              let history = try? JSONDecoder().decode([OCRResult].self, from: data) else {
            return []
        }
        return history
    }

    func clearHistory() {
        UserDefaults.standard.removeObject(forKey: historyKey)
    }
}

struct OCRResult: Codable, Identifiable {
    let id: UUID
    let text: String
    let links: [String]
    let timestamp: Date
    let imageThumbnail: Data?

    init(text: String, links: [String], imageThumbnail: Data? = nil) {
        self.id = UUID()
        self.text = text
        self.links = links
        self.timestamp = Date()
        self.imageThumbnail = imageThumbnail
    }
}
```

## Features

### 1. Long Screenshot Support
- Automatically stitch multi-screen images
- Handle very tall images (10000+ pixels)
- Optimize memory usage for large images

### 2. Multi-Language OCR
- English (default)
- Spanish
- French
- Chinese (Simplified/Traditional)
- Japanese
- Korean
- Auto-detect language

### 3. Link Types Supported
- TikTok (including short links)
- YouTube (including youtu.be)
- Instagram
- Twitter/X
- Facebook
- Reddit
- Generic URLs

### 4. Export Options
- Copy all text
- Copy specific link
- Share text as file
- Export as JSON

## Privacy Features

1. **On-Device Processing**: All OCR happens locally
2. **No Network Calls**: No data sent to servers
3. **Local Storage Only**: History stored on device
4. **Optional History**: Can disable history
5. **No Analytics**: Zero telemetry

## Performance Optimization

1. **Image Preprocessing**: Resize large images before OCR
2. **Background Processing**: OCR runs on background thread
3. **Caching**: Cache OCR results for recent images
4. **Memory Management**: Release image data after processing

## Testing

```bash
# iOS
xcodebuild test -scheme ScreenshotOCR -destination 'platform=iOS Simulator,name=iPhone 15'

# Android
./gradlew test
./gradlew connectedAndroidTest
```

## App Store / Play Store

### iOS App Store
- **Category**: Utilities
- **Privacy**: On-device processing highlighted
- **Keywords**: OCR, screenshot, text extraction, link opener

### Google Play Store
- **Category**: Tools
- **Privacy**: No data collection
- **Permissions**: Photos (read), Internet (for opening links)

## Roadmap

### Phase 1 (MVP) - 4 weeks
- [x] Basic OCR (Vision/ML Kit)
- [x] Link detection
- [x] Share sheet extension
- [x] Simple result view
- [x] iOS app

### Phase 2 - 8 weeks
- [ ] Multi-language support
- [ ] History with search
- [ ] Batch processing
- [ ] Custom link patterns
- [ ] Android app

### Phase 3 - 12 weeks
- [ ] QR code detection
- [ ] Business card parsing
- [ ] Receipt scanning
- [ ] Document scanning
- [ ] Cloud sync (optional)

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q1 2025
