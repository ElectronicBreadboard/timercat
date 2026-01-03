import AppKit
import ApplicationServices
import Foundation

/// Window information from Accessibility API and CoreGraphics.
struct WindowInfo {
    let title: String?
    let windowId: UInt32?
    let bounds: [String: Double]?
    let app: [String: Any?]
    let browser: [String: Any?]?

    func toDictionary() -> [String: Any?] {
        return [
            "title": title,
            "windowId": windowId,
            "bounds": bounds,
            "app": app,
            "browser": browser,
        ]
    }

    /// Get window info for a specific PID.
    /// Uses Accessibility API for title, CoreGraphics for window ID and bounds.
    static func getForPID(_ pid: pid_t, allowBrowser: Bool = false)
        -> WindowInfo
    {
        let app = AXUIElementCreateApplication(pid)
        let appInfo = AppInfo.fromPID(pid)
        let bundleId = appInfo["bundleId"] as? String

        // Get focused window title via Accessibility API
        var focusedWindow: CFTypeRef?
        let windowResult = AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &focusedWindow
        )

        guard windowResult == .success, let window = focusedWindow else {
            return WindowInfo(
                title: nil,
                windowId: nil,
                bounds: nil,
                app: appInfo,
                browser: nil
            )
        }

        // AX API guarantees window is AXUIElement when result == .success
        var titleValue: CFTypeRef?
        AXUIElementCopyAttributeValue(
            window as! AXUIElement,
            kAXTitleAttribute as CFString,
            &titleValue
        )
        let title = titleValue as? String

        // CoreGraphics provides stable window IDs and accurate bounds.
        // Accessibility API doesn't expose window IDs reliably.
        let (windowId, bounds) = findWindowIdAndBounds(pid: pid, title: title)

        // Get browser info if enabled and app is a browser
        var browser: [String: Any?]? = nil
        if allowBrowser, let bundleId = bundleId {
            browser = BrowserInfo.extract(
                bundleId: bundleId,
                windowTitle: title
            )
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
        let systemWide = AXUIElementCreateSystemWide()
        var focusedApp: CFTypeRef?

        let result = AXUIElementCopyAttributeValue(
            systemWide,
            kAXFocusedApplicationAttribute as CFString,
            &focusedApp
        )

        // AX API guarantees focusedApp is AXUIElement when result == .success
        let pid: pid_t
        if result == .success, let appElement = focusedApp {
            var appPid: pid_t = 0
            let pidResult = AXUIElementGetPid(
                appElement as! AXUIElement,
                &appPid
            )
            guard pidResult == .success, appPid != 0 else { return nil }
            pid = appPid
        } else {
            guard let app = NSWorkspace.shared.frontmostApplication else {
                return nil
            }
            pid = app.processIdentifier
        }

        return getForPID(pid, allowBrowser: allowBrowser)
    }
}

// MARK: - CoreGraphics Helpers

/// Find window ID and bounds using CoreGraphics.
/// Strategy: exact title match first (for multi-window apps), then first window for PID.
private func findWindowIdAndBounds(pid: pid_t, title: String?) -> (
    windowId: UInt32?, bounds: [String: Double]?
) {
    let option: CGWindowListOption = [
        .optionOnScreenOnly, .excludeDesktopElements,
    ]
    guard
        let windowList = CGWindowListCopyWindowInfo(option, kCGNullWindowID)
            as? [[String: Any]]
    else {
        return (nil, nil)
    }

    let titleToMatch = title ?? ""

    // Try exact title match first (accurate for multi-window apps)
    if !titleToMatch.isEmpty {
        for window in windowList {
            guard
                let ownerPID = window["kCGWindowOwnerPID"] as? Int,
                ownerPID == pid,
                let windowName = window["kCGWindowName"] as? String,
                windowName == titleToMatch,
                isValidWindow(window)
            else { continue }

            return extractWindowIdAndBounds(window)
        }
    }

    // Fallback: first matching window for PID
    for window in windowList {
        guard
            let ownerPID = window["kCGWindowOwnerPID"] as? Int,
            ownerPID == pid,
            isValidWindow(window)
        else { continue }

        return extractWindowIdAndBounds(window)
    }

    return (nil, nil)
}

/// Check if window is visible and not transparent
private func isValidWindow(_ window: [String: Any]) -> Bool {
    guard let isOnscreen = window["kCGWindowIsOnscreen"] as? Bool, isOnscreen
    else {
        return false
    }

    guard let alpha = window["kCGWindowAlpha"] as? Double, alpha > 0.0 else {
        return false
    }

    return true
}

private func extractWindowIdAndBounds(_ window: [String: Any]) -> (
    windowId: UInt32?, bounds: [String: Double]?
) {
    guard let windowId = window["kCGWindowNumber"] as? Int else {
        return (nil, nil)
    }

    var bounds: [String: Double]? = nil
    if let boundsDict = window["kCGWindowBounds"] as? [String: Any],
        let x = boundsDict["X"] as? Double,
        let y = boundsDict["Y"] as? Double,
        let width = boundsDict["Width"] as? Double,
        let height = boundsDict["Height"] as? Double
    {
        bounds = ["x": x, "y": y, "width": width, "height": height]
    }

    return (UInt32(windowId), bounds)
}
