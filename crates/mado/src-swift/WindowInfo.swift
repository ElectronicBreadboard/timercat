import AppKit
import ApplicationServices
import Foundation

/// Window information from Accessibility API and CoreGraphics.
struct WindowInfo {
    let title: String?
    let windowId: UInt32?
    let bounds: [String: Double]?
    let app: AppInfo
    let browser: BrowserInfo?

    func toDictionary() -> [String: Any?] {
        return [
            "title": title,
            "windowId": windowId,
            "bounds": bounds,
            "app": app.toDictionary(),
            "browser": browser?.toDictionary(),
        ]
    }

    /// Get window info for a specific PID.
    /// Uses Accessibility API for title and bounds, CoreGraphics for window ID.
    static func getForPID(_ pid: pid_t, allowBrowser: Bool = false)
        -> WindowInfo
    {
        let app = AXUIElementCreateApplication(pid)
        let appInfo = AppInfo.fromPID(pid)
        let bundleId = appInfo.bundleId

        // Get focused window via Accessibility API
        guard let windowElement = getFocusedWindow(from: app) else {
            return WindowInfo(
                title: nil,
                windowId: nil,
                bounds: nil,
                app: appInfo,
                browser: nil
            )
        }

        let title = getTitle(from: windowElement)
        let bounds = getBounds(from: windowElement)

        // CoreGraphics provides stable window IDs (Accessibility API doesn't expose window IDs reliably).
        let windowId = findWindowId(pid: pid, bounds: bounds)

        // Get browser info if enabled and app is a browser
        let browser: BrowserInfo? =
            if allowBrowser, let bundleId = bundleId {
                BrowserInfo.extract(bundleId: bundleId, windowTitle: title)
            } else {
                nil
            }

        return WindowInfo(
            title: title,
            windowId: windowId,
            bounds: bounds,
            app: appInfo,
            browser: browser
        )
    }

    /// Get frontmost window info.
    static func getFrontmost(allowBrowser: Bool = false) -> WindowInfo? {
        // Try Accessibility API first
        if let appElement = getFocusedApplication(),
            let pid = getPID(from: appElement)
        {
            return getForPID(pid, allowBrowser: allowBrowser)
        }

        // Fallback to NSWorkspace
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        return getForPID(app.processIdentifier, allowBrowser: allowBrowser)
    }
}
