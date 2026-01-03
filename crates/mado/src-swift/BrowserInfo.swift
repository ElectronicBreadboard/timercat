import Foundation

/// Browser information (URL, private mode).
struct BrowserInfo {
    let url: String?
    let isPrivate: Bool?

    /// Convert to dictionary for JSON serialization.
    func toDictionary() -> [String: Any?] {
        return ["url": url, "isPrivate": isPrivate]
    }

    private static let browserKeywords = [
        "chrome", "safari", "firefox", "edge", "brave", "opera", "arc",
        "browser",
    ]

    /// Extract browser info if the app is a browser. Returns nil if not a browser or extraction fails.
    static func extract(bundleId: String, windowTitle: String?) -> BrowserInfo?
    {
        guard isBrowser(bundleId) else { return nil }

        let url = getURL(bundleId: bundleId)
        let isPrivate = detectPrivateMode(
            bundleId: bundleId,
            windowTitle: windowTitle ?? ""
        )

        // Only return if we got something useful
        guard url != nil || isPrivate != nil else { return nil }

        return BrowserInfo(url: url, isPrivate: isPrivate)
    }

    private static func isBrowser(_ bundleId: String) -> Bool {
        let lower = bundleId.lowercased()
        return browserKeywords.contains { lower.contains($0) }
    }

    /// Get current URL from browser via AppleScript.
    /// Not all browsers support this (e.g. Firefox).
    private static func getURL(bundleId: String) -> String? {
        // Firefox doesn't support AppleScript URL extraction
        if bundleId.lowercased().contains("firefox") {
            return nil
        }

        let script = """
            tell application id "\(bundleId)"
                if (count of windows) > 0 then
                    set activeTab to active tab of front window
                    return URL of activeTab
                end if
            end tell
            """

        guard let result = runAppleScript(script) else { return nil }

        // Validate it's a URL
        let trimmed = result.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            return trimmed
        }
        return nil
    }

    /// Detect private/incognito mode.
    private static func detectPrivateMode(
        bundleId: String,
        windowTitle: String
    ) -> Bool? {
        // Try AppleScript first
        if let isPrivate = detectPrivateViaAppleScript(bundleId: bundleId) {
            return isPrivate
        }

        // Fallback to title parsing
        return detectPrivateViaTitle(windowTitle)
    }

    /// Detect private mode via AppleScript. Not all browsers support this.
    private static func detectPrivateViaAppleScript(bundleId: String) -> Bool? {
        let script = """
            tell application id "\(bundleId)"
                if (count of windows) > 0 then
                    set windowMode to mode of front window
                    if windowMode is "incognito" then
                        return "true"
                    else
                        return "false"
                    end if
                end if
            end tell
            """

        guard let result = runAppleScript(script) else { return nil }

        let trimmed = result.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed == "true" { return true }
        if trimmed == "false" { return false }
        return nil
    }

    /// Detect private mode via window title patterns.
    private static func detectPrivateViaTitle(_ title: String) -> Bool? {
        let lower = title.lowercased()
        if lower.hasSuffix("(incognito)")
            || lower.hasSuffix("(private)")
            || lower.hasSuffix(", private browsing")
        {
            return true
        }
        return nil
    }

    private static func runAppleScript(_ script: String) -> String? {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script]

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = FileHandle.nullDevice

        do {
            try process.run()
            process.waitUntilExit()

            guard process.terminationStatus == 0 else { return nil }

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return String(data: data, encoding: .utf8)
        } catch {
            return nil
        }
    }
}
