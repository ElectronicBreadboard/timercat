import ApplicationServices
import Foundation
import SwiftRs

// MARK: - Monitor Lifecycle

@_cdecl("mado_start_monitor")
public func madoStartMonitor(
    callbackPtr: UnsafeRawPointer,
    trackWindowChanges: Bool,
    allowBrowser: Bool
) {
    let callback = unsafeBitCast(callbackPtr, to: WindowEventCallback.self)
    let monitor = WindowMonitor(
        callback: callback,
        trackWindowChanges: trackWindowChanges,
        allowBrowser: allowBrowser
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
public func madoGetActiveApp() -> SRString? {
    guard let appInfo = AppInfo.getFrontmost() else { return nil }
    return toJson(appInfo)
}

@_cdecl("mado_get_active_window")
public func madoGetActiveWindow(allowBrowser: Bool) -> SRString? {
    guard let windowInfo = WindowInfo.getFrontmost(allowBrowser: allowBrowser)
    else { return nil }
    return toJson(windowInfo.toDictionary())
}

// MARK: - Helpers

private func toJson(_ dict: [String: Any?]) -> SRString? {
    guard
        let jsonData = try? JSONSerialization.data(withJSONObject: dict),
        let jsonString = String(data: jsonData, encoding: .utf8)
    else { return nil }

    return SRString(jsonString)
}
