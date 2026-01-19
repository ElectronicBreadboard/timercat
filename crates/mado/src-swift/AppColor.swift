import AppKit
import CoreImage

/// Get app brand color from preset or by extracting from icon.
func getAppColor(forBundleId bundleId: String?, icon: NSImage?) -> String? {
    if let bundleId = bundleId, let preset = appColorPresets[bundleId] {
        return preset
    }

    guard let icon = icon else { return nil }
    return extractDominantColor(from: icon)
}

/// Extract dominant color from image using Core Image CIAreaAverage filter.
/// Filters out low-saturation colors (grays/whites) that won't be visually distinctive.
private func extractDominantColor(from image: NSImage) -> String? {
    guard let tiffData = image.tiffRepresentation,
        let ciImage = CIImage(data: tiffData)
    else {
        return nil
    }

    guard let filter = CIFilter(name: "CIAreaAverage") else { return nil }
    filter.setValue(ciImage, forKey: kCIInputImageKey)
    filter.setValue(CIVector(cgRect: ciImage.extent), forKey: kCIInputExtentKey)

    guard let outputImage = filter.outputImage else { return nil }

    var bitmap = [UInt8](repeating: 0, count: 4)
    let context = CIContext(options: [.workingColorSpace: NSNull()])
    context.render(
        outputImage,
        toBitmap: &bitmap,
        rowBytes: 4,
        bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
        format: .RGBA8,
        colorSpace: nil
    )

    let r = CGFloat(bitmap[0]) / 255.0
    let g = CGFloat(bitmap[1]) / 255.0
    let b = CGFloat(bitmap[2]) / 255.0

    let maxC = max(r, g, b)
    let minC = min(r, g, b)
    let saturation = maxC == 0 ? 0 : (maxC - minC) / maxC

    // Filter out grays, whites, and near-blacks
    if saturation < 0.15 || maxC < 0.1 || maxC > 0.95 {
        return nil
    }

    return String(
        format: "#%02X%02X%02X",
        Int(r * 255),
        Int(g * 255),
        Int(b * 255)
    )
}

// MARK: - Presets

/// Brand colors for popular apps, keyed by bundle identifier.
private let appColorPresets: [String: String] = [
    // Communication
    "com.hnc.Discord": "#5865F2",
    "com.tinyspeck.slackmacgap": "#4A154B",
    "com.microsoft.teams2": "#6264A7",
    "com.microsoft.teams": "#6264A7",
    "us.zoom.xos": "#2D8CFF",
    "com.skype.skype": "#00AFF0",
    "com.apple.MobileSMS": "#34C759",
    "com.apple.FaceTime": "#34C759",

    // Browsers
    "com.google.Chrome": "#4285F4",
    "com.apple.Safari": "#006CFF",
    "org.mozilla.firefox": "#FF7139",
    "com.microsoft.edgemac": "#0078D4",
    "com.brave.Browser": "#FB542B",
    "com.operasoftware.Opera": "#FF1B2D",
    "company.thebrowser.Browser": "#FF5733",

    // Development
    "com.microsoft.VSCode": "#007ACC",
    "com.apple.dt.Xcode": "#147EFB",
    "com.jetbrains.intellij": "#087CFA",
    "com.jetbrains.WebStorm": "#07C3F2",
    "com.jetbrains.pycharm": "#21D789",
    "com.github.GitHubClient": "#24292F",
    "com.sublimetext.4": "#FF9800",
    "com.sublimetext.3": "#FF9800",
    "io.alacritty": "#F46D01",
    "com.googlecode.iterm2": "#000000",
    "com.apple.Terminal": "#000000",
    "net.kovidgoyal.kitty": "#000000",
    "dev.warp.Warp-Stable": "#01A4FF",

    // Productivity
    "com.figma.Desktop": "#F24E1E",
    "com.notion.id": "#000000",
    "com.linear": "#5E6AD2",
    "com.todoist.mac.Todoist": "#E44332",
    "com.culturedcode.ThingsMac": "#4A90D9",
    "md.obsidian": "#7C3AED",
    "com.apple.Notes": "#FFCC00",
    "com.apple.reminders": "#007AFF",

    // Media
    "com.spotify.client": "#1DB954",
    "com.apple.Music": "#FA243C",
    "com.apple.TV": "#000000",
    "com.netflix.Netflix": "#E50914",
    "com.youtube.ios.client": "#FF0000",

    // Apple Apps
    "com.apple.finder": "#007AFF",
    "com.apple.mail": "#007AFF",
    "com.apple.iCal": "#EC4339",
    "com.apple.Photos": "#FFFFFF",
    "com.apple.Preview": "#8E8E93",
    "com.apple.systempreferences": "#8E8E93",
    "com.apple.AppStore": "#007AFF",
    "com.apple.Keynote": "#007AFF",
    "com.apple.iWork.Pages": "#FF9500",
    "com.apple.iWork.Numbers": "#34C759",
]
