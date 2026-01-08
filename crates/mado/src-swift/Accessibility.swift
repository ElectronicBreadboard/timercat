import ApplicationServices
import Foundation

/// Extract window bounds (position and size) from an accessibility element.
func getBounds(from windowElement: AXUIElement) -> [String: Double]? {
    var frameRef: CFTypeRef?
    guard
        AXUIElementCopyAttributeValue(
            windowElement,
            "AXFrame" as CFString,
            &frameRef
        ) == .success,
        let frameRef
    else {
        return nil
    }

    var rect = CGRect.zero
    // Note: Force cast is safe because the Accessibility API guarantees
    // AXFrame always returns an AXValue containing a CGRect.
    guard AXValueGetValue(frameRef as! AXValue, .cgRect, &rect) else {
        return nil
    }

    return [
        "x": Double(rect.origin.x),
        "y": Double(rect.origin.y),
        "width": Double(rect.size.width),
        "height": Double(rect.size.height),
    ]
}

/// Extract title from an accessibility window element.
func getTitle(from windowElement: AXUIElement) -> String? {
    var titleRef: CFTypeRef?
    AXUIElementCopyAttributeValue(
        windowElement,
        kAXTitleAttribute as CFString,
        &titleRef
    )
    return titleRef as? String
}

/// Get the focused window from an application's accessibility element.
func getFocusedWindow(from app: AXUIElement) -> AXUIElement? {
    var windowRef: CFTypeRef?
    guard
        AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &windowRef
        ) == .success,
        let windowRef
    else {
        return nil
    }
    // Note: Force cast is safe because the Accessibility API guarantees
    // AXFocusedWindow always returns an AXUIElement.
    return (windowRef as! AXUIElement)
}
