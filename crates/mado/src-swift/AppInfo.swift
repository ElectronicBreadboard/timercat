import AppKit
import ApplicationServices
import Foundation

/// Application information from NSRunningApplication.
enum AppInfo {
    static func from(_ app: NSRunningApplication) -> [String: Any?] {
        return [
            "pid": app.processIdentifier,
            "name": app.localizedName,
            "bundleId": app.bundleIdentifier,
            "processPath": app.executableURL?.path,
        ]
    }

    static func fromPID(_ pid: pid_t) -> [String: Any?] {
        if let app = NSRunningApplication(processIdentifier: pid) {
            return from(app)
        }
        return ["pid": pid, "name": nil, "bundleId": nil, "processPath": nil]
    }

    /// Get frontmost app. Tries Accessibility API first (more reliable), falls back to NSWorkspace.
    static func getFrontmost() -> [String: Any?]? {
        let systemWide = AXUIElementCreateSystemWide()
        var focusedApp: CFTypeRef?

        let result = AXUIElementCopyAttributeValue(
            systemWide,
            kAXFocusedApplicationAttribute as CFString,
            &focusedApp
        )

        // AX API guarantees focusedApp is AXUIElement when result == .success
        if result == .success, let appElement = focusedApp {
            var pid: pid_t = 0
            let pidResult = AXUIElementGetPid(appElement as! AXUIElement, &pid)
            if pidResult == .success, pid != 0 {
                return fromPID(pid)
            }
        }

        // Fallback to NSWorkspace
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        return from(app)
    }
}
