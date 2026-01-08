import Foundation

/// Browser information (URL, private mode).
struct BrowserInfo {
    let url: String?
    let isPrivate: Bool?

    /// Convert to dictionary for JSON serialization.
    func toDictionary() -> [String: Any?] {
        return ["url": url, "isPrivate": isPrivate]
    }

    /// Known browser bundle IDs (exact matches).
    private static let browserBundleIds: Set<String> = [
        "com.google.Chrome",
        "com.brave.Browser",
        "com.apple.Safari",
        "org.mozilla.firefox",
        "com.microsoft.edgemac",
        "com.operasoftware.Opera",
        "company.thebrowser.Browser",  // Arc
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

        // Only return if we got something useful (URL or private mode detection)
        guard url != nil || isPrivate != nil else { return nil }

        return BrowserInfo(url: url, isPrivate: isPrivate)
    }

    /// Check if bundle ID belongs to a browser.
    private static func isBrowser(_ bundleId: String) -> Bool {
        return browserBundleIds.contains(bundleId)
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

    private static func runAppleScript(_ source: String, timeout: Double = 2.0)
        -> String?
    {
        let semaphore = DispatchSemaphore(value: 0)
        nonisolated(unsafe) var scriptResult: String?

        DispatchQueue.global(qos: .utility).async {
            guard let script = NSAppleScript(source: source) else {
                semaphore.signal()
                return
            }
            var error: NSDictionary?
            let result = script.executeAndReturnError(&error)
            scriptResult = result.stringValue
            semaphore.signal()
        }

        if semaphore.wait(timeout: .now() + timeout) == .timedOut {
            return nil
        }

        return scriptResult
    }
}
