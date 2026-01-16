import AppKit
import Foundation

/// Extract app icon as base64 PNG data URL.
/// Returns nil if icon cannot be extracted.
func getAppIcon(forPath appPath: String?, size: Int = 32) -> String? {
    guard let appPath = appPath else { return nil }

    // NSWorkspace.shared.icon(forFile:) handles all the complexity:
    // - Finds correct icon from app bundle (Info.plist CFBundleIconFile)
    // - Tries standard icon names (AppIcon.icns, etc.)
    // - Returns properly rendered NSImage
    let icon = NSWorkspace.shared.icon(forFile: appPath)

    guard let pngData = icon.pngData(size: size) else {
        return nil
    }

    return "data:image/png;base64,\(pngData.base64EncodedString())"
}

extension NSImage {
    /// Convert NSImage to PNG data at specified size.
    func pngData(size: Int) -> Data? {
        let targetSize = NSSize(width: size, height: size)

        // Create a new image with the target size
        let resizedImage = NSImage(size: targetSize)
        resizedImage.lockFocus()

        // Draw the original image scaled to fit
        NSGraphicsContext.current?.imageInterpolation = .high
        self.draw(
            in: NSRect(origin: .zero, size: targetSize),
            from: NSRect(origin: .zero, size: self.size),
            operation: .copy,
            fraction: 1.0
        )

        resizedImage.unlockFocus()

        // Convert to PNG
        guard let tiffData = resizedImage.tiffRepresentation,
            let bitmap = NSBitmapImageRep(data: tiffData),
            let pngData = bitmap.representation(using: .png, properties: [:])
        else {
            return nil
        }

        return pngData
    }
}
