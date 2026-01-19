use tauri::{
    AppHandle, CloseRequestApi, Manager, PhysicalPosition, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

// MARK: - Window

/// All window types in the app.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Window {
    Main,
    Cat,
    Settings,
    History,
}

impl Window {
    /// Unique window label for Tauri.
    pub fn label(&self) -> &'static str {
        return match self {
            Self::Main => "main",
            Self::Cat => "cat",
            Self::Settings => "settings",
            Self::History => "history",
        };
    }

    /// Window title.
    pub fn title(&self) -> &'static str {
        return match self {
            Self::Main => "Focuscat",
            Self::Cat => "Focuscat",
            Self::Settings => "Focuscat Settings",
            Self::History => "Focuscat History",
        };
    }

    /// Route path for the window.
    pub fn path(&self) -> &'static str {
        return match self {
            Self::Main => "/window/main",
            Self::Cat => "/window/cat",
            Self::Settings => "/window/settings",
            Self::History => "/window/history",
        };
    }

    /// Window size (width, height).
    pub fn size(&self) -> (f64, f64) {
        return match self {
            Self::Main => (300.0, 500.0),
            Self::Cat => (180.0, 220.0),
            Self::Settings => (600.0, 450.0),
            Self::History => (600.0, 450.0),
        };
    }

    /// Minimum window size, if any.
    pub fn min_size(&self) -> Option<(f64, f64)> {
        return match self {
            Self::Main => None,
            Self::Cat => None,
            Self::Settings => Some((500.0, 400.0)),
            Self::History => Some((500.0, 400.0)),
        };
    }

    /// Get existing window if it exists.
    pub fn get(&self, app: &AppHandle) -> Option<WebviewWindow> {
        return app.get_webview_window(self.label());
    }

    /// Show window (reuse existing or create new).
    pub fn show(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        // Reuse existing window if available
        if let Some(window) = self.get(app) {
            window.show()?;
            window.set_focus()?;
            return Ok(window);
        }

        // Create new window
        let window = self.build(app)?;
        window.show()?;
        window.set_focus()?;
        return Ok(window);
    }

    /// Hide window if it exists.
    pub fn hide(&self, app: &AppHandle) -> tauri::Result<()> {
        if let Some(window) = self.get(app) {
            window.hide()?;
        }
        return Ok(());
    }

    // MARK: - Build

    fn build(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        return match self {
            Self::Main => self.build_main(app),
            Self::Cat => self.build_cat(app),
            Self::Settings => self.build_settings(app),
            Self::History => self.build_history(app),
        };
    }

    fn build_main(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let mut builder = self
            .base_builder(app)
            .resizable(true)
            .maximizable(false)
            .minimizable(true)
            .transparent(false)
            .always_on_top(false);

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .decorations(true)
                .title_bar_style(TitleBarStyle::Overlay)
                .hidden_title(true);
        }

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder.decorations(false);
        }

        return builder.build();
    }

    fn build_cat(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        return self
            .base_builder(app)
            .resizable(false)
            .maximizable(false)
            .minimizable(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .shadow(false)
            .skip_taskbar(true)
            .build();
    }

    fn build_settings(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let (width, height) = self.size();

        let mut builder = self
            .base_builder(app)
            .resizable(true)
            .maximizable(false)
            .minimizable(true)
            .transparent(false)
            .always_on_top(false);

        // Center over main window if available, otherwise center on screen
        if let Some(pos) = Self::position_centered_over(app, Self::Main, width, height) {
            builder = builder.position(pos.x as f64, pos.y as f64);
        } else {
            builder = builder.center();
        }

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .decorations(true)
                .title_bar_style(TitleBarStyle::Overlay)
                .hidden_title(true);
        }

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder.decorations(false);
        }

        return builder.build();
    }

    fn build_history(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let (width, height) = self.size();

        let mut builder = self
            .base_builder(app)
            .resizable(true)
            .maximizable(false)
            .minimizable(true)
            .transparent(false)
            .always_on_top(false);

        // Center over main window if available, otherwise center on screen
        if let Some(pos) = Self::position_centered_over(app, Self::Main, width, height) {
            builder = builder.position(pos.x as f64, pos.y as f64);
        } else {
            builder = builder.center();
        }

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .decorations(true)
                .title_bar_style(TitleBarStyle::Overlay)
                .hidden_title(true);
        }

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder.decorations(false);
        }

        return builder.build();
    }

    fn base_builder<'a>(
        &self,
        app: &'a AppHandle,
    ) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle> {
        let (width, height) = self.size();

        let mut builder =
            WebviewWindowBuilder::new(app, self.label(), WebviewUrl::App(self.path().into()))
                .title(self.title())
                .visible(false)
                .inner_size(width, height);

        if let Some((min_w, min_h)) = self.min_size() {
            builder = builder.min_inner_size(min_w, min_h);
        }

        return builder;
    }

    // MARK: - Events

    /// Handle window close request.
    pub fn handle_close(label: &str, window: &tauri::Window, api: &CloseRequestApi) {
        // Main window hides instead of closing (can reopen from tray).
        // Settings/History windows hide and show main window.
        match label {
            "main" => {
                api.prevent_close();
                let _ = window.hide();
            }
            "settings" | "history" => {
                api.prevent_close();
                let _ = window.hide();
                let _ = Window::Main.show(window.app_handle());
            }
            _ => {}
        }
    }

    // MARK: - Helpers

    /// Calculate position to center a window over another window.
    fn position_centered_over(
        app: &AppHandle,
        target: Window,
        width: f64,
        height: f64,
    ) -> Option<PhysicalPosition<i32>> {
        let target_window = target.get(app)?;
        let target_pos = target_window.outer_position().ok()?;
        let target_size = target_window.outer_size().ok()?;

        let x = target_pos.x + (target_size.width as i32 - width as i32) / 2;
        let y = target_pos.y + (target_size.height as i32 - height as i32) / 2;

        return Some(PhysicalPosition::new(x, y));
    }
}
