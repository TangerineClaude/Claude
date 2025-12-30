# Samsung-Style Scroll Capture

## Overview
Capture long scrolling screens as a single image - like Samsung's scroll capture feature, but universal.

## Outcome
Never take multiple screenshots again. Capture entire web pages, chats, documents, and social feeds as one seamless image.

## MVP Features

### Core Functionality
- **Auto-Scroll Capture**: Automatically scroll and capture
- **Assistive Overlay**: Floating button to start capture
- **Stitch Quality**: Seamless image stitching with alignment
- **Manual Control**: Pause/resume during capture
- **Crop Tool**: Trim captured image
- **Share Integration**: Save or share result
- **Format Options**: PNG or JPEG export

### Privacy & Security
- On-device processing
- No network access required
- No data collection

## Tech Stack

### iOS
- **Language**: Swift/SwiftUI
- **Capture**: UIGraphicsImageRenderer + scroll view monitoring
- **Stitching**: Core Graphics for image composition
- **Overlay**: Floating window with accessibility permissions

### Android
- **Language**: Kotlin
- **Capture**: AccessibilityService for scroll detection
- **Stitching**: Android Canvas
- **Overlay**: System alert window permission

## Architecture

```
┌──────────────────┐
│ Assistive Overlay│
│  (Floating Btn)  │
└────────┬─────────┘
         │
    ┌────▼────┐
    │ Capture │
    │ Engine  │
    └────┬────┘
         │
    ┌────▼────┐
    │ Scroll  │
    │ Manager │
    └────┬────┘
         │
    ┌────▼────┐
    │ Image   │
    │ Stitcher│
    └────┬────┘
         │
    ┌────▼────┐
    │ Result  │
    │  View   │
    └─────────┘
```

## Getting Started

### iOS Development

```bash
cd projects/scroll-capture-tool/ios
open ScrollCapture.xcodeproj
```

**Note**: iOS has strict limitations on screen capture outside your own app. This feature works best within a dedicated browser or document viewer app.

### Android Development

```bash
cd projects/scroll-capture-tool/android
./gradlew build
```

**Permissions Required**:
- `SYSTEM_ALERT_WINDOW` - For floating overlay
- `AccessibilityService` - For scroll detection and capture

## Implementation

### Scroll Capture Engine (Android)

```kotlin
// ScrollCaptureService.kt
import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.view.accessibility.AccessibilityEvent

class ScrollCaptureService : AccessibilityService() {
    private val capturedScreens = mutableListOf<Bitmap>()
    private var isCapturing = false
    private var lastScrollY = 0

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!isCapturing) return

        when (event?.eventType) {
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> {
                val currentScrollY = event.scrollY
                if (currentScrollY != lastScrollY) {
                    captureScreen()
                    lastScrollY = currentScrollY

                    // Auto-detect end of scroll
                    if (!canScrollFurther()) {
                        stopCapture()
                    }
                }
            }
        }
    }

    fun startCapture() {
        isCapturing = true
        capturedScreens.clear()
        captureScreen()
        simulateScroll()
    }

    fun stopCapture() {
        isCapturing = false
        val stitchedImage = stitchImages(capturedScreens)
        saveCapturedImage(stitchedImage)
    }

    private fun captureScreen() {
        // Use Media Projection API
        val bitmap = takeScreenshot()
        if (bitmap != null) {
            capturedScreens.add(bitmap)
        }
    }

    private fun simulateScroll() {
        // Simulate scroll gesture
        val scrollAction = AccessibilityService.GLOBAL_ACTION_SCROLL_DOWN
        performGlobalAction(scrollAction)
    }

    private fun canScrollFurther(): Boolean {
        // Check if more content available
        val rootNode = rootInActiveWindow ?: return false
        return rootNode.isScrollable && rootNode.actionList.any {
            it.id == AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        }
    }

    private fun stitchImages(images: List<Bitmap>): Bitmap {
        if (images.isEmpty()) return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)

        val stitcher = ImageStitcher()
        return stitcher.stitch(images)
    }

    override fun onInterrupt() {
        stopCapture()
    }
}
```

### Image Stitching Algorithm

```kotlin
// ImageStitcher.kt
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect

class ImageStitcher {
    fun stitch(images: List<Bitmap>): Bitmap {
        if (images.isEmpty()) return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888)
        if (images.size == 1) return images[0]

        // Calculate overlaps and total height
        val overlaps = calculateOverlaps(images)
        val width = images[0].width
        val totalHeight = images[0].height + images.drop(1).zip(overlaps).sumOf { (img, overlap) ->
            img.height - overlap
        }

        // Create stitched bitmap
        val stitched = Bitmap.createBitmap(width, totalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(stitched)

        var currentY = 0
        canvas.drawBitmap(images[0], 0f, 0f, null)
        currentY += images[0].height

        for (i in 1 until images.size) {
            val image = images[i]
            val overlap = overlaps[i - 1]

            // Draw with overlap adjustment
            val srcRect = Rect(0, overlap, image.width, image.height)
            val dstRect = Rect(0, currentY - overlap, image.width, currentY - overlap + image.height - overlap)

            canvas.drawBitmap(image, srcRect, dstRect, null)
            currentY += (image.height - overlap)
        }

        return stitched
    }

    private fun calculateOverlaps(images: List<Bitmap>): List<Int> {
        val overlaps = mutableListOf<Int>()

        for (i in 0 until images.size - 1) {
            val current = images[i]
            val next = images[i + 1]

            // Find overlap using image comparison
            val overlap = findOverlap(current, next)
            overlaps.add(overlap)
        }

        return overlaps
    }

    private fun findOverlap(img1: Bitmap, img2: Bitmap): Int {
        val searchHeight = minOf(img1.height / 2, img2.height / 2, 200)

        var bestMatch = 0
        var bestScore = Double.MAX_VALUE

        for (offset in 0 until searchHeight) {
            val score = compareRegions(
                img1, img1.height - searchHeight,
                img2, offset,
                searchHeight - offset
            )

            if (score < bestScore) {
                bestScore = score
                bestMatch = searchHeight - offset
            }
        }

        return bestMatch
    }

    private fun compareRegions(
        img1: Bitmap, y1: Int,
        img2: Bitmap, y2: Int,
        height: Int
    ): Double {
        var totalDiff = 0.0
        var pixelCount = 0

        for (y in 0 until height) {
            for (x in 0 until img1.width) {
                if (y1 + y >= img1.height || y2 + y >= img2.height) continue

                val pixel1 = img1.getPixel(x, y1 + y)
                val pixel2 = img2.getPixel(x, y2 + y)

                val diff = pixelDifference(pixel1, pixel2)
                totalDiff += diff
                pixelCount++
            }
        }

        return if (pixelCount > 0) totalDiff / pixelCount else Double.MAX_VALUE
    }

    private fun pixelDifference(pixel1: Int, pixel2: Int): Double {
        val r1 = (pixel1 shr 16) and 0xFF
        val g1 = (pixel1 shr 8) and 0xFF
        val b1 = pixel1 and 0xFF

        val r2 = (pixel2 shr 16) and 0xFF
        val g2 = (pixel2 shr 8) and 0xFF
        val b2 = pixel2 and 0xFF

        return kotlin.math.sqrt(
            ((r1 - r2) * (r1 - r2) +
             (g1 - g2) * (g1 - g2) +
             (b1 - b2) * (b1 - b2)).toDouble()
        )
    }
}
```

### Floating Overlay (Android)

```kotlin
// OverlayService.kt
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.WindowManager
import android.widget.ImageView

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private lateinit var floatingView: ImageView

    override fun onCreate() {
        super.onCreate()

        floatingView = LayoutInflater.from(this)
            .inflate(R.layout.floating_button, null) as ImageView

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.TOP or Gravity.START
        params.x = 0
        params.y = 100

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        windowManager.addView(floatingView, params)

        floatingView.setOnClickListener {
            startScrollCapture()
        }
    }

    private fun startScrollCapture() {
        // Start capture service
        val intent = Intent(this, ScrollCaptureService::class.java)
        startService(intent)
    }

    override fun onDestroy() {
        super.onDestroy()
        windowManager.removeView(floatingView)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
```

## Features

### 1. Auto-Scroll
- Automatic scrolling at configurable speed
- Smart pause on dynamic content loading
- Scroll direction detection

### 2. Manual Control
- Pause/resume capture
- Manual scroll control
- Cancel and restart

### 3. Quality Options
- Standard: 72 DPI
- High: 144 DPI
- Ultra: 300 DPI

### 4. Post-Processing
- Crop unwanted sections
- Adjust colors/contrast
- Add watermark (optional)

## Limitations

### iOS Limitations
- Cannot capture outside app sandbox
- Works best in custom web view or document app
- No system-wide screen capture without jailbreak

### Android Limitations
- Requires accessibility permissions
- May not work with all apps (security restrictions)
- Performance varies by device

## Alternative Approaches

### Web Extension (Chrome/Firefox)
```javascript
// For web pages only
chrome.tabs.captureVisibleTab((screenshot) => {
  // Scroll page
  window.scrollBy(0, window.innerHeight);

  // Capture again and stitch
});
```

### Desktop App (Electron)
- Full screen capture capabilities
- Works across all applications
- Better stitching control

## Testing

```bash
# Android
./gradlew test
./gradlew connectedAndroidTest

# Test stitching accuracy
./gradlew testStitchingAccuracy
```

## Privacy & Permissions

### Android
- `android.permission.SYSTEM_ALERT_WINDOW`
- `android.permission.BIND_ACCESSIBILITY_SERVICE`
- `android.permission.WRITE_EXTERNAL_STORAGE`

### iOS
- `NSPhotoLibraryAddUsageDescription`
- Limited to in-app content only

## Roadmap

### Phase 1 (MVP) - 6 weeks
- [x] Basic scroll capture
- [x] Image stitching
- [x] Floating overlay
- [x] Save/share
- [x] Android app

### Phase 2 - 10 weeks
- [ ] Advanced stitching (better alignment)
- [ ] Manual scroll control
- [ ] Crop tool
- [ ] Quality settings
- [ ] iOS limited implementation

### Phase 3 - 14 weeks
- [ ] Web extension
- [ ] Desktop app
- [ ] Video recording mode
- [ ] OCR integration
- [ ] Cloud sync

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q2 2025
