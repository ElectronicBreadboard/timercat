import SwiftRs
import AppKit
import Foundation
import CoreGraphics

// =============================================================================
// Callback Type
// =============================================================================

typealias WindowCallback = @convention(c) (UnsafePointer<SRString>) -> Void

// =============================================================================
// Global State
// =============================================================================

private var monitorInstance: WindowMonitor?

// =============================================================================
// Monitor
// =============================================================================

class WindowMonitor: NSObject {
    private let callback: WindowCallback
    private var observers: [AXObserver] = []
    private var currentPID: pid_t = 0
    private var isRunning = false
    private var notificationObserver: NSObjectProtocol?
    private var monitorRunLoop: CFRunLoop?
    
    init(callback: @escaping WindowCallback) {
        self.callback = callback
    }
    
    func start() {
        guard !isRunning else { return }
        isRunning = true
        monitorRunLoop = CFRunLoopGetCurrent()
        
        NSLog("[Monitor] 🟢 START")
        
        // App activation notification
        // IMPORTANT: NSWorkspace posts on main thread, so we use OperationQueue.main
        // Then schedule the actual work back to our monitor's runloop
        notificationObserver = NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: OperationQueue.main  // Receive on main thread
        ) { [weak self] notification in
            guard let self = self else { return }
            guard let runLoop = self.monitorRunLoop else { return }
            
            guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication else {
                return
            }
            
            let newPID = app.processIdentifier
            NSLog("[Monitor] 🎯 App activated: %@ (PID: %d)", app.localizedName ?? "unknown", newPID)
            
            // Schedule observer setup on our monitor thread's runloop
            CFRunLoopPerformBlock(runLoop, CFRunLoopMode.defaultMode.rawValue) {
                if newPID != self.currentPID {
                    self.cleanupObservers()
                    self.observeApp(pid: newPID)
                }
            }
            CFRunLoopWakeUp(runLoop)
        }
        NSLog("[Monitor] ✅ Registered app activation observer")
        
        // Observe initial app
        if let frontApp = NSWorkspace.shared.frontmostApplication {
            NSLog("[Monitor] Initial: %@ (PID: %d)", frontApp.localizedName ?? "unknown", frontApp.processIdentifier)
            observeApp(pid: frontApp.processIdentifier)
        }
        
        // Run run loop
        NSLog("[Monitor] Starting RunLoop...")
        RunLoop.current.run()
    }
    
    func stop() {
        guard isRunning else { return }
        isRunning = false
        
        // Remove notification observer
        if let observer = notificationObserver {
            NSWorkspace.shared.notificationCenter.removeObserver(observer)
            notificationObserver = nil
        }
        
        // Cleanup AX observers
        cleanupObservers()
        
        // Stop the monitor's runloop (not the calling thread's runloop)
        if let runLoop = monitorRunLoop {
            CFRunLoopStop(runLoop)
            monitorRunLoop = nil
        }
        
        NSLog("[Monitor] 🔴 STOPPED")
    }
    
    private func cleanupObservers() {
        // Remove run loop sources before clearing
        for observer in observers {
            CFRunLoopRemoveSource(
                monitorRunLoop ?? CFRunLoopGetCurrent(),
                AXObserverGetRunLoopSource(observer),
                .defaultMode
            )
        }
        observers.removeAll()
    }
    
    private func observeApp(pid: pid_t) {
        currentPID = pid
        
        // Create observer with callback
        var observer: AXObserver?
        let result = AXObserverCreate(pid, axObserverCallback, &observer)
        
        guard result == .success, let observer = observer else {
            NSLog("[Monitor] ❌ Failed to create AXObserver: %d", result.rawValue)
            return
        }
        
        NSLog("[Monitor] ✅ Created AXObserver")
        
        let app = AXUIElementCreateApplication(pid)
        let context = Unmanaged.passUnretained(self).toOpaque()
        
        // Observe window focus changes ON THE APP
        AXObserverAddNotification(
            observer,
            app,
            kAXFocusedWindowChangedNotification as CFString,
            context
        )
        NSLog("[Monitor] ✅ Added focus change notification")
        
        // Register title observer on the FOCUSED WINDOW (not the app)
        registerTitleObserver(forObserver: observer)
        
        // Add to run loop
        CFRunLoopAddSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(observer),
            .defaultMode
        )
        NSLog("[Monitor] ✅ Added observer to run loop")
        
        observers.append(observer)
        
        // Send initial title
        NSLog("[Monitor] 📤 Sending initial title...")
        sendWindowTitle()
        NSLog("[Monitor] ✅ observeApp complete")
    }
    
    fileprivate func registerTitleObserver(forObserver observer: AXObserver) {
        let app = AXUIElementCreateApplication(currentPID)
        
        // Get focused window
        var focusedWindow: CFTypeRef?
        let result = AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &focusedWindow
        )
        
        guard result == .success, let window = focusedWindow else {
            return
        }
        
        let context = Unmanaged.passUnretained(self).toOpaque()
        
        // Observe title changes ON THE WINDOW (not the app)
        AXObserverAddNotification(
            observer,
            window as! AXUIElement,
            kAXTitleChangedNotification as CFString,
            context
        )
    }
    
    fileprivate func sendWindowTitle() {
        let app = AXUIElementCreateApplication(currentPID)
        
        // Get focused window from the app
        var focusedWindow: CFTypeRef?
        let windowResult = AXUIElementCopyAttributeValue(
            app,
            kAXFocusedWindowAttribute as CFString,
            &focusedWindow
        )
        
        guard windowResult == .success, let window = focusedWindow else {
            sendTitle("(no window)")
            return
        }
        
        // Get title from the window
        var titleValue: CFTypeRef?
        AXUIElementCopyAttributeValue(
            window as! AXUIElement,
            kAXTitleAttribute as CFString,
            &titleValue
        )
        
        let title = (titleValue as? String) ?? "(no title)"
        sendTitle(title)
    }
    
    private func sendTitle(_ title: String) {
        let srTitle = SRString(title)
        withUnsafePointer(to: srTitle) { ptr in
            callback(ptr)
        }
    }
}

// =============================================================================
// AX Observer Callback
// =============================================================================

private func axObserverCallback(
    observer: AXObserver,
    element: AXUIElement,
    notification: CFString,
    refcon: UnsafeMutableRawPointer?
) {
    guard let refcon = refcon else { return }
    let monitor = Unmanaged<WindowMonitor>.fromOpaque(refcon).takeUnretainedValue()
    
    // Re-register title observer when focus changes
    if notification as String == kAXFocusedWindowChangedNotification as String {
        monitor.registerTitleObserver(forObserver: observer)
    }
    
    monitor.sendWindowTitle()
}

// =============================================================================
// C API
// =============================================================================

@_cdecl("mado_start_monitor")
public func madoStartMonitor(callbackPtr: UnsafeRawPointer) {
    let callback = unsafeBitCast(callbackPtr, to: WindowCallback.self)
    let monitor = WindowMonitor(callback: callback)
    monitorInstance = monitor
    monitor.start()
}

@_cdecl("mado_stop_monitor")
public func madoStopMonitor() {
    monitorInstance?.stop()
    monitorInstance = nil
}

@_cdecl("mado_is_trusted")
public func madoIsTrusted() -> Bool {
    return AXIsProcessTrusted()
}
