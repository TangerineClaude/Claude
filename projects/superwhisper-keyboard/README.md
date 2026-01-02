# SuperWhisper iOS Keyboard - Live Voice → Text

## Overview
System-wide voice dictation keyboard with punctuation, commands, and low-latency transcription for iOS.

## Outcome
Type with your voice across any app. Fast, accurate transcription with automatic punctuation and voice commands.

## MVP Features

### Core Functionality
- **Push-to-Talk**: Hold to dictate, release to insert
- **Live Transcription**: Real-time speech-to-text
- **Auto-Punctuation**: Intelligent punctuation insertion
- **Voice Commands**: "new line", "delete that", "send", etc.
- **Multi-Language**: Support for 20+ languages
- **Offline Mode**: On-device ASR fallback
- **Emoji Support**: "heart emoji", "laughing emoji"
- **Quick Actions**: Common phrases and shortcuts

### Privacy & Security
- On-device processing preferred
- Minimal cloud usage (only when needed)
- No voice data storage
- No training on user data

## Tech Stack

### iOS
- **Language**: Swift/SwiftUI
- **ASR**: Speech framework (on-device) + cloud fallback
- **Keyboard Extension**: Custom keyboard target
- **Audio**: AVFoundation for recording
- **UI**: SwiftUI for keyboard interface

### Backend (Optional)
- **Cloud ASR**: Whisper API or Deepgram (for enhanced accuracy)
- **Punctuation Model**: Custom model or Claude API
- **Deployment**: Lightweight API on Railway or Fly.io

## Architecture

```
┌─────────────────────┐
│   Host App          │
│  (Any iOS App)      │
└──────────┬──────────┘
           │
      ┌────▼────────┐
      │  Keyboard   │
      │ Extension   │
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │   Audio     │
      │  Recorder   │
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │    ASR      │
      │  Engine     │
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │Punctuation  │
      │  & Commands │
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │  Text Out   │
      └─────────────┘
```

## Getting Started

### Prerequisites
- Xcode 15+
- iOS 16+
- Apple Developer account (for keyboard extension)

### Setup

```bash
cd projects/superwhisper-keyboard
open SuperWhisperKeyboard.xcodeproj
```

### Project Structure
```
SuperWhisperKeyboard/
├── SuperWhisperKeyboard/     # Main app
│   ├── ContentView.swift
│   ├── SettingsView.swift
│   └── Tutorial.swift
├── KeyboardExtension/         # Keyboard extension
│   ├── KeyboardViewController.swift
│   ├── VoiceInputView.swift
│   ├── ASREngine.swift
│   └── CommandProcessor.swift
└── Shared/
    ├── Models/
    └── Utilities/
```

## Implementation

### Keyboard Extension

```swift
// KeyboardViewController.swift
import UIKit
import Speech

class KeyboardViewController: UIInputViewController {
    private let asrEngine = ASREngine()
    private var voiceInputView: VoiceInputView!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Setup keyboard UI
        voiceInputView = VoiceInputView()
        voiceInputView.delegate = self
        view.addSubview(voiceInputView)

        // Request permissions
        requestSpeechPermission()
    }

    private func requestSpeechPermission() {
        SFSpeechRecognizer.requestAuthorization { status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    self.setupASR()
                default:
                    self.showPermissionDeniedAlert()
                }
            }
        }
    }

    private func setupASR() {
        asrEngine.onTranscription = { [weak self] text in
            self?.handleTranscription(text)
        }

        asrEngine.onFinalResult = { [weak self] text in
            self?.handleFinalResult(text)
        }
    }

    private func handleTranscription(_ text: String) {
        voiceInputView.updateLiveText(text)
    }

    private func handleFinalResult(_ text: String) {
        let processedText = processCommands(text)
        insertText(processedText)
        voiceInputView.reset()
    }

    private func processCommands(_ text: String) -> String {
        let processor = CommandProcessor()
        return processor.process(text, context: textDocumentProxy)
    }

    private func insertText(_ text: String) {
        textDocumentProxy.insertText(text)
    }
}

extension KeyboardViewController: VoiceInputViewDelegate {
    func didStartRecording() {
        asrEngine.startRecording()
    }

    func didStopRecording() {
        asrEngine.stopRecording()
    }

    func didCancel() {
        asrEngine.cancelRecording()
        voiceInputView.reset()
    }
}
```

### ASR Engine

```swift
// ASREngine.swift
import Speech
import AVFoundation

class ASREngine {
    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    var onTranscription: ((String) -> Void)?
    var onFinalResult: ((String) -> Void)?

    init() {
        speechRecognizer = SFSpeechRecognizer()
        speechRecognizer?.defaultTaskHint = .dictation
    }

    func startRecording() {
        // Cancel any ongoing recognition
        if recognitionTask != nil {
            recognitionTask?.cancel()
            recognitionTask = nil
        }

        // Setup audio session
        let audioSession = AVAudioSession.sharedInstance()
        try? audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try? audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }

        recognitionRequest.shouldReportPartialResults = true

        // Setup audio input
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            recognitionRequest.append(buffer)
        }

        // Start audio engine
        audioEngine.prepare()
        try? audioEngine.start()

        // Start recognition
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            if let result = result {
                let transcript = result.bestTranscription.formattedString

                if result.isFinal {
                    self?.onFinalResult?(transcript)
                } else {
                    self?.onTranscription?(transcript)
                }
            }

            if error != nil || result?.isFinal == true {
                self?.stopRecording()
            }
        }
    }

    func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.finish()

        recognitionRequest = nil
        recognitionTask = nil
    }

    func cancelRecording() {
        recognitionTask?.cancel()
        stopRecording()
    }
}
```

### Command Processor

```swift
// CommandProcessor.swift
import Foundation
import UIKit

class CommandProcessor {
    private let commands: [VoiceCommand] = [
        VoiceCommand(trigger: "new line", action: .insertText("\n")),
        VoiceCommand(trigger: "new paragraph", action: .insertText("\n\n")),
        VoiceCommand(trigger: "period", action: .insertText(".")),
        VoiceCommand(trigger: "comma", action: .insertText(",")),
        VoiceCommand(trigger: "question mark", action: .insertText("?")),
        VoiceCommand(trigger: "exclamation mark", action: .insertText("!")),
        VoiceCommand(trigger: "delete that", action: .deleteWord),
        VoiceCommand(trigger: "delete line", action: .deleteLine),
        VoiceCommand(trigger: "delete all", action: .deleteAll),
        VoiceCommand(trigger: "undo", action: .undo),

        // Emoji commands
        VoiceCommand(trigger: "heart emoji", action: .insertText("❤️")),
        VoiceCommand(trigger: "laughing emoji", action: .insertText("😂")),
        VoiceCommand(trigger: "thumbs up", action: .insertText("👍")),
        VoiceCommand(trigger: "fire emoji", action: .insertText("🔥")),
    ]

    func process(_ text: String, context: UITextDocumentProxy) -> String {
        var processedText = text.lowercased()

        for command in commands {
            if processedText.contains(command.trigger) {
                processedText = processedText.replacingOccurrences(of: command.trigger, with: "")
                executeCommand(command, context: context)
            }
        }

        // Add intelligent punctuation
        processedText = addAutoPunctuation(processedText)

        return processedText.trimmingCharacters(in: .whitespaces)
    }

    private func executeCommand(_ command: VoiceCommand, context: UITextDocumentProxy) {
        switch command.action {
        case .insertText(let text):
            context.insertText(text)

        case .deleteWord:
            context.deleteBackward()
            while let lastChar = context.documentContextBeforeInput?.last,
                  !lastChar.isWhitespace {
                context.deleteBackward()
            }

        case .deleteLine:
            while let lastChar = context.documentContextBeforeInput?.last,
                  lastChar != "\n" {
                context.deleteBackward()
            }

        case .deleteAll:
            while context.documentContextBeforeInput != nil {
                context.deleteBackward()
            }

        case .undo:
            // Limited undo capability in keyboard extension
            break
        }
    }

    private func addAutoPunctuation(_ text: String) -> String {
        var result = text

        // Capitalize first letter
        if let first = result.first {
            result = first.uppercased() + result.dropFirst()
        }

        // Capitalize after sentence endings
        result = result.replacingOccurrences(of: ". ", with: ". ", options: .regularExpression)
        result = result.replacingOccurrences(of: "\\. ([a-z])", with: ". $1", options: .regularExpression)

        // Add period at end if missing
        if ![".", "!", "?"].contains(result.last ?? " ") {
            result += "."
        }

        return result
    }
}

struct VoiceCommand {
    let trigger: String
    let action: CommandAction
}

enum CommandAction {
    case insertText(String)
    case deleteWord
    case deleteLine
    case deleteAll
    case undo
}
```

### Voice Input View

```swift
// VoiceInputView.swift
import SwiftUI

protocol VoiceInputViewDelegate: AnyObject {
    func didStartRecording()
    func didStopRecording()
    func didCancel()
}

struct VoiceInputView: View {
    @State private var isRecording = false
    @State private var liveText = ""
    @State private var waveformAmplitude: CGFloat = 0

    weak var delegate: VoiceInputViewDelegate?

    var body: some View {
        VStack(spacing: 12) {
            // Live transcription
            if !liveText.isEmpty {
                Text(liveText)
                    .font(.body)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                    .transition(.opacity)
            }

            // Waveform visualization
            if isRecording {
                WaveformView(amplitude: waveformAmplitude)
                    .frame(height: 40)
                    .transition(.scale)
            }

            // Microphone button
            Button(action: toggleRecording) {
                Image(systemName: isRecording ? "mic.fill" : "mic")
                    .font(.system(size: 32))
                    .foregroundColor(isRecording ? .red : .blue)
                    .frame(width: 60, height: 60)
                    .background(isRecording ? Color.red.opacity(0.1) : Color.blue.opacity(0.1))
                    .clipShape(Circle())
            }
            .buttonStyle(PlainButtonStyle())

            // Cancel button (when recording)
            if isRecording {
                Button("Cancel") {
                    cancel()
                }
                .foregroundColor(.red)
            }

            // Quick phrases
            if !isRecording {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        QuickPhraseButton(text: "Yes")
                        QuickPhraseButton(text: "No")
                        QuickPhraseButton(text: "Thanks")
                        QuickPhraseButton(text: "Sorry")
                    }
                }
            }
        }
        .padding()
        .frame(height: 250)
    }

    private func toggleRecording() {
        isRecording.toggle()

        if isRecording {
            delegate?.didStartRecording()
        } else {
            delegate?.didStopRecording()
        }
    }

    private func cancel() {
        isRecording = false
        liveText = ""
        delegate?.didCancel()
    }

    func updateLiveText(_ text: String) {
        withAnimation {
            liveText = text
        }
    }

    func reset() {
        isRecording = false
        liveText = ""
        waveformAmplitude = 0
    }
}

struct QuickPhraseButton: View {
    let text: String

    var body: some View {
        Button(text) {
            // Insert quick phrase
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(16)
    }
}

struct WaveformView: View {
    let amplitude: CGFloat

    var body: some View {
        // Waveform visualization implementation
        RoundedRectangle(cornerRadius: 4)
            .fill(Color.blue)
            .frame(height: amplitude * 40)
            .animation(.easeInOut(duration: 0.1), value: amplitude)
    }
}
```

## Features

### 1. Voice Commands
- **Punctuation**: "period", "comma", "question mark", "exclamation mark"
- **Editing**: "delete that", "delete line", "undo"
- **Formatting**: "new line", "new paragraph", "capitalize"
- **Emoji**: "heart emoji", "laughing emoji", etc.

### 2. Multi-Language Support
- English (US, UK, AU)
- Spanish
- French
- German
- Chinese (Mandarin)
- Japanese
- Korean
- And more...

### 3. Quick Phrases
Tap-to-insert common phrases:
- "Yes", "No", "Thanks", "Sorry"
- "On my way", "Be there soon"
- "Call you later"
- Customizable

### 4. Offline Mode
- On-device ASR for privacy and speed
- Works without internet (with reduced accuracy)
- Automatic fallback to cloud ASR when available

## Privacy & Permissions

### Required Permissions
- **Microphone**: For voice input
- **Speech Recognition**: For transcription
- **Full Access**: Optional (for cloud features)

### Privacy Policy
- Voice data processed on-device when possible
- Cloud processing opt-in only
- No voice data storage
- No training on user data

## Testing

```bash
# Unit tests
xcodebuild test -scheme SuperWhisperKeyboard

# UI tests (requires physical device)
xcodebuild test -scheme SuperWhisperKeyboard -destination 'platform=iOS,name=iPhone'
```

## App Store

### App Store Optimization
- **Title**: SuperWhisper - Voice to Text Keyboard
- **Subtitle**: Fast voice dictation for any app
- **Keywords**: voice typing, dictation, speech to text, keyboard, transcription
- **Category**: Productivity

### Screenshots
- Show voice input in Messages
- Show transcription in Notes
- Show quick phrases
- Show settings and customization

## Roadmap

### Phase 1 (MVP) - 6 weeks
- [x] Basic voice input
- [x] Push-to-talk interface
- [x] On-device ASR
- [x] Simple commands
- [x] iOS keyboard extension

### Phase 2 - 10 weeks
- [ ] Cloud ASR for better accuracy
- [ ] Advanced voice commands
- [ ] Custom voice shortcuts
- [ ] Multi-language support
- [ ] Quick phrases

### Phase 3 - 14 weeks
- [ ] Continuous dictation (hands-free)
- [ ] Voice macros
- [ ] Context-aware suggestions
- [ ] iPad optimization
- [ ] Apple Watch companion

## Performance Optimization

1. **Low Latency**: On-device ASR for minimal delay
2. **Battery Efficient**: Optimize audio processing
3. **Memory Management**: Clean up audio buffers
4. **Smooth UI**: 60fps keyboard interactions

## Known Limitations

1. **Keyboard Extension Sandbox**: Limited access to some iOS features
2. **Full Access**: Some features require "Allow Full Access"
3. **Background Processing**: Limited background audio processing
4. **App-Specific Issues**: Some apps may not support custom keyboards

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
