import ApplicationServices
import Foundation
import SwiftRs

// MARK: - Monitor Lifecycle

@_cdecl("mado_start_monitor")
public func madoStartMonitor(
    callbackPtr: UnsafeRawPointer,
    trackWindowChanges: Bool,
    allowBrowser: Bool,
    includeIcon: Bool
) {
    // Singleton check: Rust side already prevents concurrent calls, this is defensive
    guard WindowMonitor.shared == nil else { return }

    // unsafeBitCast is safe here: Rust guarantees callbackPtr is a valid WindowEventCallback function pointer
    let callback = unsafeBitCast(callbackPtr, to: WindowEventCallback.self)
    let monitor = WindowMonitor(
        callback: callback,
        trackWindowChanges: trackWindowChanges,
        allowBrowser: allowBrowser,
        includeIcon: includeIcon
    )
    WindowMonitor.shared = monitor
    monitor.start()
}

@_cdecl("mado_stop_monitor")
public func madoStopMonitor() {
    WindowMonitor.shared?.stop()
    WindowMonitor.shared = nil
}

// MARK: - Permissions

@_cdecl("mado_is_trusted")
public func madoIsTrusted() -> Bool {
    return AXIsProcessTrusted()
}

// MARK: - Queries

@_cdecl("mado_get_active_app")
public func madoGetActiveApp(includeIcon: Bool) -> SRString? {
    guard let appInfo = AppInfo.getFrontmost(includeIcon: includeIcon) else {
        return nil
    }
    return toJson(appInfo.toDictionary())
}

@_cdecl("mado_get_active_window")
public func madoGetActiveWindow(allowBrowser: Bool, includeIcon: Bool)
    -> SRString?
{
    guard
        let windowInfo = WindowInfo.getFrontmost(
            allowBrowser: allowBrowser,
            includeIcon: includeIcon
        )
    else { return nil }
    return toJson(windowInfo.toDictionary())
}

// MARK: - Helpers

private func toJson(_ dict: [String: Any?]) -> SRString? {
    guard
        let jsonData = try? JSONSerialization.data(withJSONObject: dict),
        let jsonString = String(data: jsonData, encoding: .utf8)
    else {
        Log.warn("Failed to serialize query response to JSON")
        return nil
    }

    return SRString(jsonString)
}
