import ApplicationServices
import Foundation

/// Find window ID and bounds using CoreGraphics.
/// Strategy: exact title match first (for multi-window apps), then first window for PID (title matching rarely works as kCGWindowName is typically empty).
func findWindowIdAndBounds(pid: pid_t, title: String?) -> (
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

    // Try title match first (rarely succeeds as kCGWindowName is typically empty)
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
    // Note: CoreGraphics returns windows in frontmost-first order (z-order), 
    // so the first window for a PID is the focused/frontmost window
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

/// Check if window is visible and not transparent.
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

/// Extract window ID and bounds from CoreGraphics window dictionary.
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
