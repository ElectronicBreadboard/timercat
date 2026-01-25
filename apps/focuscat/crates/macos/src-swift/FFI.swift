import Foundation
import IOKit.hid
import SwiftRs

// MARK: - Permissions

@_cdecl("macos_is_input_monitoring_enabled")
public func isInputMonitoringEnabled() -> Bool {
    return IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)
        == kIOHIDAccessTypeGranted
}

// MARK: - Installed Apps

@_cdecl("macos_get_installed_apps")
public func macosGetInstalledApps(includeIcons: Bool, iconSize: Int32)
    -> SRString?
{
    let apps = scanInstalledApps(
        includeIcons: includeIcons,
        iconSize: Int(iconSize)
    )
    let dicts = apps.map { $0.toDictionary() }

    guard
        let jsonData = try? JSONSerialization.data(withJSONObject: dicts),
        let jsonString = String(data: jsonData, encoding: .utf8)
    else {
        return nil
    }

    return SRString(jsonString)
}

@_cdecl("macos_get_app_icon")
public func macosGetAppIcon(bundleId: SRString, iconSize: Int32) -> SRString? {
    let result = getAppIconByBundleId(bundleId.toString(), size: Int(iconSize))

    let dict: [String: Any?] = [
        "dataUrl": result.dataUrl,
        "color": result.color,
    ]

    guard
        let jsonData = try? JSONSerialization.data(withJSONObject: dict),
        let jsonString = String(data: jsonData, encoding: .utf8)
    else {
        return nil
    }

    return SRString(jsonString)
}
