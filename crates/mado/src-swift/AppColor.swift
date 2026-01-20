import AppKit

/// Get app brand color from preset or by extracting from icon.
func getAppColor(forBundleId bundleId: String?, icon: NSImage?) -> String? {
    // Check presets first (known brand colors)
    if let bundleId = bundleId, let preset = appColorPresets[bundleId] {
        return preset
    }

    guard let icon = icon else { return nil }
    return extractBrandColor(from: icon)
}

// MARK: - Color Extraction

/// Extract brand color using k-means palette.
/// Picks most vibrant color, or falls back to dominant non-white for grayscale icons.
private func extractBrandColor(from image: NSImage) -> String? {
    let palette = extractColorPalette(from: image, numberOfColors: 5)
    guard !palette.isEmpty else { return nil }

    // Pick most vibrant color (threshold filters out near-grayscale)
    if let bestVibrant = palette.max(by: { $0.vibrancy < $1.vibrancy }),
        bestVibrant.vibrancy > 0.1
    {
        return bestVibrant.hexString
    }

    // Fallback for grayscale icons: dominant non-white color
    for color in palette where color.brightness <= 0.9 {
        return color.hexString
    }

    return palette.first?.hexString
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
