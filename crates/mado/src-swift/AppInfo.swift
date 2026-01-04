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

    /// Get frontmost app info.
    static func getFrontmost() -> AppInfo? {
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        return fromNS(app)
    }
}
