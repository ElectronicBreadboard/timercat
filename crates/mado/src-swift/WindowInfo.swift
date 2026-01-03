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
    /// Uses Accessibility API for title, CoreGraphics for window ID and bounds.
    static func getForPID(_ pid: pid_t, allowBrowser: Bool = false)
        -> WindowInfo
    {
        let app = AXUIElementCreateApplication(pid)
        let appInfo = AppInfo.fromPID(pid)
        let bundleId = appInfo.bundleId

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
