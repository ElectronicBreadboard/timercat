import AppKit
import ApplicationServices
import Foundation

/// Application information from NSRunningApplication.
struct AppInfo {
    let pid: pid_t
    let name: String?
    let bundleId: String?
    let processPath: String?

    /// Convert to dictionary for JSON serialization.
    func toDictionary() -> [String: Any?] {
        return [
            "pid": pid,
            "name": name,
            "bundleId": bundleId,
            "processPath": processPath,
        ]
    }

    /// Create from NSRunningApplication.
    static func from(_ app: NSRunningApplication) -> AppInfo {
        return AppInfo(
            pid: app.processIdentifier,
            name: app.localizedName,
            bundleId: app.bundleIdentifier,
            processPath: app.executableURL?.path
        )
    }

    /// Create from PID.
    static func fromPID(_ pid: pid_t) -> AppInfo {
        if let app = NSRunningApplication(processIdentifier: pid) {
            return from(app)
        }
        return AppInfo(
            pid: pid,
            name: nil,
            bundleId: nil,
            processPath: nil
        )
    }

    /// Get frontmost app. Tries Accessibility API first (more reliable), falls back to NSWorkspace.
    static func getFrontmost() -> AppInfo? {
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
