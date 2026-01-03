import ApplicationServices
import Foundation

/// Extract bounds (position and size) from an AXUIElement window.
/// Returns nil if bounds cannot be retrieved.
func getBounds(from windowElement: AXUIElement) -> [String: Double]? {
    var frameValue: CFTypeRef?

    guard
        AXUIElementCopyAttributeValue(
            windowElement,
            "AXFrame" as CFString,
            &frameValue
        ) == .success,
        let frame = frameValue
    else {
        return nil
    }

    var rect = CGRect.zero

    // AXFrame is a CGRect (x, y, width, height)
    guard AXValueGetValue(frame as! AXValue, .cgRect, &rect) else {
        return nil
    }

    return [
        "x": Double(rect.origin.x),
        "y": Double(rect.origin.y),
        "width": Double(rect.size.width),
        "height": Double(rect.size.height),
    ]
}

/// Extract title from an AXUIElement window.
/// Returns nil if title cannot be retrieved.
func getTitle(from windowElement: AXUIElement) -> String? {
    var titleValue: CFTypeRef?
    AXUIElementCopyAttributeValue(
        windowElement,
        kAXTitleAttribute as CFString,
        &titleValue
    )
    return titleValue as? String
}

/// Get focused window from an application.
/// Returns nil if no focused window is available.
func getFocusedWindow(from app: AXUIElement) -> AXUIElement? {
    var focusedWindow: CFTypeRef?
    let result = AXUIElementCopyAttributeValue(
        app,
        kAXFocusedWindowAttribute as CFString,
        &focusedWindow
    )
    // AX API guarantees focusedWindow is AXUIElement when result == .success
    guard result == .success, let window = focusedWindow else {
        return nil
    }
    return (window as! AXUIElement)
}

/// Get focused application from system.
/// Returns nil if no focused application is available.
func getFocusedApplication() -> AXUIElement? {
    let systemWide = AXUIElementCreateSystemWide()
    var focusedApp: CFTypeRef?

    let result = AXUIElementCopyAttributeValue(
        systemWide,
        kAXFocusedApplicationAttribute as CFString,
        &focusedApp
    )

    // AX API guarantees focusedApp is AXUIElement when result == .success
    guard result == .success, let appElement = focusedApp else {
        return nil
    }
    return (appElement as! AXUIElement)
}

/// Get PID from an AXUIElement application.
/// Returns nil if PID cannot be retrieved.
func getPID(from appElement: AXUIElement) -> pid_t? {
    var pid: pid_t = 0
    let result = AXUIElementGetPid(appElement, &pid)
    guard result == .success, pid != 0 else {
        return nil
    }
    return pid
}
