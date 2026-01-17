use crate::environment::configs::{app::AppConfig, window::WindowConfig};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

// MARK: - Window Identifier

/// Window identifier for getting existing windows.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WindowId {
    /// Main app window (timer, etc.)
    Main,
    /// Floating cat widget overlay
    Cat,
    /// Settings window
    Settings,
}

impl WindowId {
    pub fn label(&self) -> &'static str {
        return match self {
            Self::Main => "main",
            Self::Cat => "cat",
            Self::Settings => "settings",
        };
    }

    pub fn get(&self, app: &AppHandle) -> Option<WebviewWindow> {
        return app.get_webview_window(self.label());
    }
}

// MARK: - Show Window

/// Window creation request with configuration.
#[derive(Debug, Clone, Copy)]
pub enum ShowWindow {
    Main,
    Cat,
    Settings,
}

impl ShowWindow {
    pub fn id(&self) -> WindowId {
        return match self {
            Self::Main => WindowId::Main,
            Self::Cat => WindowId::Cat,
            Self::Settings => WindowId::Settings,
        };
    }

    pub fn show(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let id = self.id();

        // Reuse existing window if available
        if let Some(existing) = id.get(app) {
            existing.show()?;
            existing.set_focus()?;
            return Ok(existing);
        }

        // Create new window based on type
        let window = match self {
            Self::Main => self.build_main_window(app)?,
            Self::Cat => self.build_cat_window(app)?,
            Self::Settings => self.build_settings_window(app)?,
        };

        window.show()?;
        window.set_focus()?;
        return Ok(window);
    }

    // MARK: - Build Windows

    fn build_main_window(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let (width, height) = WindowConfig::main_size();

        let builder = self
            .base_builder(app, "/window/main")
            .inner_size(width, height)
            .resizable(true)
            .maximizable(false)
            .minimizable(true)
            .transparent(false)
            .always_on_top(false);

        #[cfg(target_os = "macos")]
        let builder = builder
            .decorations(true)
            .title_bar_style(TitleBarStyle::Overlay)
            .hidden_title(true);

        #[cfg(not(target_os = "macos"))]
        let builder = builder.decorations(false);

        return builder.build();
    }

    fn build_cat_window(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let (width, height) = WindowConfig::cat_size();

        return self
            .base_builder(app, "/window/cat")
            .inner_size(width, height)
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

    fn build_settings_window(&self, app: &AppHandle) -> tauri::Result<WebviewWindow> {
        let (width, height) = WindowConfig::settings_size();
        let (min_width, min_height) = WindowConfig::settings_min_size();

        let builder = self
            .base_builder(app, "/window/settings")
            .inner_size(width, height)
            .min_inner_size(min_width, min_height)
            .resizable(true)
            .maximizable(false)
            .minimizable(true)
            .transparent(false)
            .always_on_top(false)
            .center();

        #[cfg(target_os = "macos")]
        let builder = builder
            .decorations(true)
            .title_bar_style(TitleBarStyle::Overlay)
            .hidden_title(true);

        #[cfg(not(target_os = "macos"))]
        let builder = builder.decorations(false);

        return builder.build();
    }

    fn base_builder<'a>(
        &self,
        app: &'a AppHandle,
        path: &str,
    ) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle> {
        let id = self.id();

        return WebviewWindowBuilder::new(app, id.label(), WebviewUrl::App(path.into()))
            .title(AppConfig::app_title())
            .visible(false);
    }
}
