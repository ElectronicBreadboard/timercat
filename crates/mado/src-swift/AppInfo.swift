import AppKit
import ApplicationServices
import Foundation

/// Application information from NSRunningApplication.
struct AppInfo {
    let pid: pid_t
    let name: String?
    let bundleId: String?
    let processPath: String?
    let icon: String?

    /// Convert to dictionary for JSON serialization.
    func toDictionary() -> [String: Any?] {
        return [
            "pid": pid,
            "name": name,
            "bundleId": bundleId,
            "processPath": processPath,
            "icon": icon,
        ]
    }

    /// Create from NSRunningApplication.
    static func fromNS(_ app: NSRunningApplication, includeIcon: Bool = false)
        -> AppInfo
    {
        let bundlePath = app.bundleURL?.path
        return AppInfo(
            pid: app.processIdentifier,
            name: app.localizedName,
            bundleId: app.bundleIdentifier,
            processPath: app.executableURL?.path,
            icon: includeIcon ? getAppIcon(forPath: bundlePath) : nil
        )
    }

    /// Create from PID.
    static func fromPID(_ pid: pid_t, includeIcon: Bool = false) -> AppInfo {
        // Try to get full info from NSRunningApplication
        if let app = NSRunningApplication(processIdentifier: pid) {
            return fromNS(app, includeIcon: includeIcon)
        }
        // Fallback to minimal info with just PID
        return AppInfo(
            pid: pid,
            name: nil,
            bundleId: nil,
            processPath: nil,
            icon: nil
        )
    }

    /// Get frontmost app info.
    static func getFrontmost(includeIcon: Bool = false) -> AppInfo? {
        guard let app = NSWorkspace.shared.frontmostApplication else {
            return nil
        }
        return fromNS(app, includeIcon: includeIcon)
    }
}
