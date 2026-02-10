import Foundation
import IOKit.hid
import SwiftRs

// MARK: - Permissions

@_cdecl("macos_is_input_monitoring_enabled")
public func isInputMonitoringEnabled() -> Bool {
    return IOHIDCheckAccess(kIOHIDRequestTypeListenEvent)
        == kIOHIDAccessTypeGranted
}
