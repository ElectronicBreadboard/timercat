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

    /// Create from AXUIElement application.
    static func fromAX(_ appElement: AXUIElement) -> AppInfo? {
        guard let pid = getPID(from: appElement) else {
            return nil
        }
        return fromPID(pid)
    }

    /// Create from NSRunningApplication.
    static func fromNS(_ app: NSRunningApplication) -> AppInfo {
        return AppInfo(
            pid: app.processIdentifier,
            name: app.localizedName,
            bundleId: app.bundleIdentifier,
            processPath: app.executableURL?.path
        )
    }

    /// Create from PID.
    static func fromPID(_ pid: pid_t) -> AppInfo {
        // Try to get full info from NSRunningApplication
        if let app = NSRunningApplication(processIdentifier: pid) {
            return fromNS(app)
        }
        // Fallback to minimal info with just PID
        return AppInfo(
            pid: pid,
            name: nil,
            bundleId: nil,
            processPath: nil
        )
    }

    /// Get frontmost app. Tries Accessibility API first (more reliable), falls back to NSWorkspace.
    static func getFrontmost() -> AppInfo? {
        // Try Accessibility API first
        if let appElement = getFocusedApplication() {
            return fromAX(appElement)
        }

        // Fallback to NSWorkspace
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        return fromNS(app)
    }
}
