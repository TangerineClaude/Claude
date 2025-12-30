# Keyboard Copilot (Perplexity-style)

## Overview
AI-powered keyboard assistant for rewriting, summarizing, translating, and web research from any app.

## Outcome
Get instant AI help while typing anywhere. Rewrite text, find information, translate, and more - without leaving your current app.

## MVP Features

### Core Actions
- **Rewrite**: Polish, make professional, casual, or concise
- **Summarize**: Condense long text to key points
- **Translate**: 50+ languages
- **Expand**: Add detail and context
- **Fix Grammar**: Correct spelling and grammar
- **Web Search**: Quick facts and answers
- **Generate**: Continue writing or generate ideas

### UI Features
- **Prompt Bar**: Quick access to AI commands
- **Presets**: One-tap common actions
- **History**: Recent transformations
- **Favorites**: Save custom prompts
- **Source Links**: Citations for web-based answers

### Privacy & Security
- Optional cloud processing
- No data retention
- User controls data sharing
- End-to-end encryption option

## Tech Stack

### iOS
- **Language**: Swift/SwiftUI
- **Keyboard Extension**: Custom keyboard target
- **AI**: Claude API or GPT-4
- **Search**: Perplexity API or Brave Search API
- **Cache**: UserDefaults or CoreData

### Android
- **Language**: Kotlin
- **IME**: InputMethodService
- **AI**: Same as iOS
- **UI**: Jetpack Compose

## Architecture

```
┌─────────────────┐
│   Host App      │
│  (Any App)      │
└────────┬────────┘
         │
    ┌────▼────────┐
    │  Keyboard   │
    │  Extension  │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │    Text     │
    │  Selection  │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  AI Engine  │
    │  (Claude)   │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Transform  │
    │  & Replace  │
    └─────────────┘
```

## Getting Started

### iOS Setup

```bash
cd projects/keyboard-copilot/ios
open KeyboardCopilot.xcodeproj

# Install dependencies (if using CocoaPods/SPM)
pod install
```

### Configuration

```swift
// Config.swift
struct AIConfig {
    static let apiKey = ProcessInfo.processInfo.environment["ANTHROPIC_API_KEY"] ?? ""
    static let model = "claude-3-5-sonnet-20241022"
    static let maxTokens = 1000
    static let temperature = 0.7
}

struct SearchConfig {
    static let provider = SearchProvider.brave  // or .perplexity
    static let apiKey = ProcessInfo.processInfo.environment["SEARCH_API_KEY"] ?? ""
}

enum SearchProvider {
    case brave
    case perplexity
    case duckduckgo
}
```

## Implementation

### Keyboard Extension

```swift
// KeyboardViewController.swift
import UIKit

class KeyboardViewController: UIInputViewController {
    private var copilotView: CopilotKeyboardView!
    private let aiEngine = AIEngine()

    override func viewDidLoad() {
        super.viewDidLoad()

        setupKeyboard()
        setupActions()
    }

    private func setupKeyboard() {
        copilotView = CopilotKeyboardView()
        copilotView.delegate = self
        view.addSubview(copilotView)

        // Layout constraints...
    }

    private func setupActions() {
        copilotView.actions = [
            .rewrite(style: .professional),
            .rewrite(style: .casual),
            .rewrite(style: .concise),
            .summarize,
            .translate,
            .fixGrammar,
            .expand,
            .webSearch
        ]
    }

    private func getSelectedText() -> String? {
        return textDocumentProxy.documentContextBeforeInput
    }

    private func replaceText(with newText: String) {
        // Delete current selection
        if let beforeInput = textDocumentProxy.documentContextBeforeInput {
            for _ in 0..<beforeInput.count {
                textDocumentProxy.deleteBackward()
            }
        }

        // Insert new text
        textDocumentProxy.insertText(newText)
    }
}

extension KeyboardViewController: CopilotKeyboardViewDelegate {
    func didSelectAction(_ action: CopilotAction) {
        guard let selectedText = getSelectedText() else {
            showError("No text selected")
            return
        }

        copilotView.showLoading()

        Task {
            do {
                let result = try await aiEngine.processAction(action, text: selectedText)
                await MainActor.run {
                    replaceText(with: result.text)
                    copilotView.hideLoading()

                    if let sources = result.sources {
                        copilotView.showSources(sources)
                    }
                }
            } catch {
                await MainActor.run {
                    showError(error.localizedDescription)
                    copilotView.hideLoading()
                }
            }
        }
    }

    func didEnterCustomPrompt(_ prompt: String) {
        guard let selectedText = getSelectedText() else { return }

        Task {
            let result = try await aiEngine.customPrompt(prompt, text: selectedText)
            await MainActor.run {
                replaceText(with: result.text)
            }
        }
    }
}
```

### AI Engine

```swift
// AIEngine.swift
import Foundation

class AIEngine {
    private let client: AnthropicClient

    init() {
        self.client = AnthropicClient(apiKey: AIConfig.apiKey)
    }

    func processAction(_ action: CopilotAction, text: String) async throws -> AIResult {
        let prompt = buildPrompt(for: action, text: text)

        let response = try await client.messages.create(
            model: AIConfig.model,
            maxTokens: AIConfig.maxTokens,
            messages: [
                Message(role: .user, content: prompt)
            ]
        )

        let resultText = response.content.first?.text ?? text

        // If web search action, fetch sources
        var sources: [Source]? = nil
        if case .webSearch = action {
            sources = try await fetchSources(for: text)
        }

        return AIResult(text: resultText, sources: sources)
    }

    func customPrompt(_ prompt: String, text: String) async throws -> AIResult {
        let fullPrompt = """
        \(prompt)

        Text to process:
        \(text)
        """

        let response = try await client.messages.create(
            model: AIConfig.model,
            maxTokens: AIConfig.maxTokens,
            messages: [
                Message(role: .user, content: fullPrompt)
            ]
        )

        let resultText = response.content.first?.text ?? text
        return AIResult(text: resultText, sources: nil)
    }

    private func buildPrompt(for action: CopilotAction, text: String) -> String {
        switch action {
        case .rewrite(let style):
            return buildRewritePrompt(style: style, text: text)

        case .summarize:
            return """
            Summarize the following text into key bullet points:

            \(text)

            Provide a concise summary with the most important points.
            """

        case .translate(let language):
            return """
            Translate the following text to \(language):

            \(text)

            Provide only the translation, no explanations.
            """

        case .fixGrammar:
            return """
            Fix grammar and spelling errors in the following text:

            \(text)

            Return the corrected text only.
            """

        case .expand:
            return """
            Expand and add more detail to the following text:

            \(text)

            Make it more comprehensive while maintaining the original meaning.
            """

        case .webSearch:
            return """
            Provide a concise answer to this query based on current knowledge:

            \(text)

            Be factual and cite sources if possible.
            """
        }
    }

    private func buildRewritePrompt(style: RewriteStyle, text: String) -> String {
        let styleInstruction: String
        switch style {
        case .professional:
            styleInstruction = "Rewrite this in a professional, business-appropriate tone:"
        case .casual:
            styleInstruction = "Rewrite this in a casual, friendly tone:"
        case .concise:
            styleInstruction = "Make this more concise while preserving the key message:"
        case .detailed:
            styleInstruction = "Expand this with more detail and context:"
        }

        return """
        \(styleInstruction)

        \(text)

        Return only the rewritten text.
        """
    }

    private func fetchSources(for query: String) async throws -> [Source] {
        // Implement web search (Brave Search API, Perplexity, etc.)
        let searchResults = try await performWebSearch(query)

        return searchResults.map { result in
            Source(
                title: result.title,
                url: result.url,
                snippet: result.snippet
            )
        }
    }

    private func performWebSearch(_ query: String) async throws -> [SearchResult] {
        // Implementation depends on search provider
        // Example: Brave Search API
        let url = URL(string: "https://api.search.brave.com/res/v1/web/search?q=\(query)")!
        var request = URLRequest(url: url)
        request.addValue("Bearer \(SearchConfig.apiKey)", forHTTPHeaderField: "Authorization")

        let (data, _) = try await URLSession.shared.data(for: request)
        let results = try JSONDecoder().decode(BraveSearchResponse.self, from: data)

        return results.web.results.map { result in
            SearchResult(
                title: result.title,
                url: result.url,
                snippet: result.description
            )
        }
    }
}

enum CopilotAction {
    case rewrite(style: RewriteStyle)
    case summarize
    case translate(language: String)
    case fixGrammar
    case expand
    case webSearch
}

enum RewriteStyle {
    case professional
    case casual
    case concise
    case detailed
}

struct AIResult {
    let text: String
    let sources: [Source]?
}

struct Source {
    let title: String
    let url: String
    let snippet: String
}

struct SearchResult {
    let title: String
    let url: String
    let snippet: String
}
```

### Copilot Keyboard View

```swift
// CopilotKeyboardView.swift
import SwiftUI

protocol CopilotKeyboardViewDelegate: AnyObject {
    func didSelectAction(_ action: CopilotAction)
    func didEnterCustomPrompt(_ prompt: String)
}

struct CopilotKeyboardView: View {
    @State private var selectedAction: CopilotAction?
    @State private var customPrompt = ""
    @State private var showPromptBar = false
    @State private var isLoading = false
    @State private var sources: [Source]?

    weak var delegate: CopilotKeyboardViewDelegate?
    var actions: [CopilotAction] = []

    var body: some View {
        VStack(spacing: 8) {
            // Custom prompt bar
            if showPromptBar {
                HStack {
                    TextField("Ask anything...", text: $customPrompt)
                        .textFieldStyle(RoundedBorderTextFieldStyle())

                    Button("Go") {
                        delegate?.didEnterCustomPrompt(customPrompt)
                        customPrompt = ""
                        showPromptBar = false
                    }
                    .disabled(customPrompt.isEmpty)

                    Button("Cancel") {
                        showPromptBar = false
                        customPrompt = ""
                    }
                }
                .padding(.horizontal)
            }

            // Action buttons
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    // Custom prompt button
                    ActionButton(
                        icon: "sparkles",
                        label: "Custom",
                        color: .purple
                    ) {
                        showPromptBar.toggle()
                    }

                    Divider()

                    // Preset actions
                    ActionButton(icon: "doc.text", label: "Polish") {
                        delegate?.didSelectAction(.rewrite(style: .professional))
                    }

                    ActionButton(icon: "text.quote", label: "Casual") {
                        delegate?.didSelectAction(.rewrite(style: .casual))
                    }

                    ActionButton(icon: "arrow.down.right.and.arrow.up.left", label: "Concise") {
                        delegate?.didSelectAction(.rewrite(style: .concise))
                    }

                    ActionButton(icon: "list.bullet", label: "Summarize") {
                        delegate?.didSelectAction(.summarize)
                    }

                    ActionButton(icon: "globe", label: "Translate") {
                        showTranslateOptions()
                    }

                    ActionButton(icon: "checkmark.circle", label: "Fix") {
                        delegate?.didSelectAction(.fixGrammar)
                    }

                    ActionButton(icon: "magnifyingglass", label: "Search") {
                        delegate?.didSelectAction(.webSearch)
                    }
                }
                .padding(.horizontal)
            }

            // Loading indicator
            if isLoading {
                ProgressView("Processing...")
                    .padding()
            }

            // Sources (for web search)
            if let sources = sources, !sources.isEmpty {
                SourcesView(sources: sources)
            }
        }
        .frame(height: showPromptBar ? 200 : 100)
        .background(Color(UIColor.systemBackground))
    }

    func showLoading() {
        isLoading = true
    }

    func hideLoading() {
        isLoading = false
    }

    func showSources(_ sources: [Source]) {
        self.sources = sources
    }

    private func showTranslateOptions() {
        // Show language picker
        // For MVP, could show a few common languages
    }
}

struct ActionButton: View {
    let icon: String
    let label: String
    var color: Color = .blue
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(label)
                    .font(.caption)
            }
            .frame(width: 70, height: 60)
            .background(color.opacity(0.1))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct SourcesView: View {
    let sources: [Source]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sources")
                .font(.caption)
                .foregroundColor(.gray)

            ForEach(sources.indices, id: \.self) { index in
                Link(destination: URL(string: sources[index].url)!) {
                    HStack {
                        Image(systemName: "link")
                            .font(.caption)
                        Text(sources[index].title)
                            .font(.caption)
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}
```

## Features

### 1. Quick Actions
- **Polish**: Make professional
- **Casual**: Make friendly
- **Concise**: Shorten
- **Summarize**: Key points
- **Translate**: Any language
- **Fix**: Grammar and spelling
- **Expand**: Add detail
- **Search**: Get facts

### 2. Custom Prompts
- Free-form AI requests
- Save favorites
- Recent history
- Share prompts with community

### 3. Web-Enhanced
- Real-time facts
- Source citations
- Up-to-date information
- Multiple search providers

### 4. Smart Context
- Understands app context (email, messaging, notes)
- Adjusts tone automatically
- Learns preferences over time

## Privacy Features

1. **Optional Processing**: Choose on-device vs cloud
2. **No Data Retention**: Requests not stored
3. **Transparent Usage**: Clear data handling
4. **User Control**: Disable features individually

## Testing

```bash
# iOS
xcodebuild test -scheme KeyboardCopilot

# Test AI transformations
# Manual testing required for keyboard functionality
```

## Roadmap

### Phase 1 (MVP) - 6 weeks
- [x] Basic rewrite actions
- [x] Summarize and translate
- [x] Custom prompt support
- [x] iOS keyboard extension

### Phase 2 - 10 weeks
- [ ] Web search integration
- [ ] Source citations
- [ ] History and favorites
- [ ] More languages
- [ ] Android IME

### Phase 3 - 14 weeks
- [ ] Context awareness
- [ ] Learning preferences
- [ ] Prompt marketplace
- [ ] Voice input integration
- [ ] Desktop app (macOS/Windows)

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
