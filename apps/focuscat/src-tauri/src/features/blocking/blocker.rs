use super::{
    config::BlockingConfig,
    types::{BlockingViolationDto, BlockingViolationEvent},
};
use crate::{
    app::window::Window,
    common::url::extract_domain,
    features::focus_profile::{
        resolution::{resolve_for_app, resolve_for_website, ResolutionProfile},
        types::RuleAction,
    },
};
use tauri::AppHandle;
use tauri_specta::Event;

pub struct Blocker {
    profiles: Vec<ResolutionProfile>,
    active_violation: Option<BlockingViolation>,
}

impl Blocker {
    pub fn new() -> Self {
        return Self {
            profiles: Vec::new(),
            active_violation: None,
        };
    }

    /// Handle an app switch. Checks if the app is blocked and updates the overlay.
    pub fn handle_app_activated(
        &mut self,
        app: &AppHandle,
        bundle_id: Option<&str>,
        app_name: Option<&str>,
    ) {
        if Self::is_own_app(bundle_id, app_name) {
            return;
        }

        let violation = self.check_app(bundle_id);

        #[cfg(debug_assertions)]
        println!(
            "[Blocker] app_activated: name={:?} bundle_id={:?} violation={:?}",
            app_name,
            bundle_id,
            violation.as_ref().map(|v| &v.blocked_target)
        );

        if violation.is_none() {
            let _ = Window::Blocker.hide(app);
        }

        self.set_violation(app, violation);
    }

    /// Handle a window focus change. Checks app + browser URL and positions the overlay.
    pub fn handle_window_changed(
        &mut self,
        app: &AppHandle,
        bundle_id: Option<&str>,
        app_name: Option<&str>,
        browser_url: Option<&str>,
        bounds: Option<(f64, f64, f64, f64)>,
    ) {
        if Self::is_own_app(bundle_id, app_name) {
            return;
        }

        let violation = self.check_window(bundle_id, browser_url);

        #[cfg(debug_assertions)]
        println!(
            "[Blocker] window_changed: name={:?} bundle_id={:?} violation={:?}",
            app_name,
            bundle_id,
            violation.as_ref().map(|v| &v.blocked_target)
        );

        if violation.is_some() {
            if let Some((x, y, w, h)) = bounds {
                let _ = Window::Blocker.show_at_bounds(app, x, y, w, h);
            }
        } else {
            let _ = Window::Blocker.hide(app);
        }

        self.set_violation(app, violation);
    }

    pub fn active_violation(&self) -> Option<BlockingViolation> {
        return self.active_violation.clone();
    }

    pub fn set_profiles(&mut self, profiles: Vec<ResolutionProfile>) {
        self.profiles = profiles;
    }

    fn set_violation(&mut self, app: &AppHandle, violation: Option<BlockingViolation>) {
        self.active_violation = violation.clone();
        let dto = violation.map(BlockingViolationDto::from);
        let _ = BlockingViolationEvent(dto).emit(app);
    }

    /// Check if the given app belongs to our own app (never block ourselves).
    fn is_own_app(bundle_id: Option<&str>, app_name: Option<&str>) -> bool {
        if let Some(bid) = bundle_id {
            if BlockingConfig::own_bundle_ids().contains(&bid) {
                return true;
            }
        }
        // Dev builds may not have a bundle_id; fall back to app name
        if let Some(name) = app_name {
            if name.to_lowercase().starts_with("focuscat") {
                return true;
            }
        }
        return false;
    }

    /// Check if an app is blocked.
    fn check_app(&self, bundle_id: Option<&str>) -> Option<BlockingViolation> {
        let bid = bundle_id?;
        let (action, profile) = resolve_for_app(bid, &self.profiles)?;
        if matches!(action, RuleAction::Block) {
            return Some(BlockingViolation {
                profile_id: profile.profile_id,
                profile_name: profile.profile_name.clone(),
                profile_color: profile.profile_color.clone(),
                blocked_target: BlockedTarget::App {
                    bundle_id: bid.to_string(),
                },
            });
        }
        return None;
    }

    /// Check if a website is blocked.
    fn check_website(&self, domain: &str) -> Option<BlockingViolation> {
        let (action, profile) = resolve_for_website(domain, &self.profiles)?;
        if matches!(action, RuleAction::Block) {
            return Some(BlockingViolation {
                profile_id: profile.profile_id,
                profile_name: profile.profile_name.clone(),
                profile_color: profile.profile_color.clone(),
                blocked_target: BlockedTarget::Website {
                    domain: domain.to_string(),
                },
            });
        }
        return None;
    }

    /// Check if a window is blocked (app + browser URL).
    fn check_window(
        &self,
        bundle_id: Option<&str>,
        browser_url: Option<&str>,
    ) -> Option<BlockingViolation> {
        // App blocked -> everything inside it is blocked
        if let Some(violation) = self.check_app(bundle_id) {
            return Some(violation);
        }
        // App not blocked -> check browser URL
        if let Some(url) = browser_url {
            if let Some(domain) = extract_domain(url) {
                return self.check_website(&domain);
            }
        }
        return None;
    }
}

/// Violation reported when a blocked app or website is detected.
#[derive(Debug, Clone)]
pub struct BlockingViolation {
    pub profile_id: i64,
    pub profile_name: String,
    pub profile_color: Option<String>,
    pub blocked_target: BlockedTarget,
}

/// What was blocked: app (by bundle ID) or website (by domain).
#[derive(Debug, Clone)]
pub enum BlockedTarget {
    App { bundle_id: String },
    Website { domain: String },
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;

    impl Blocker {
        fn is_app_blocked(&self, bundle_id: &str) -> bool {
            return self.check_app(Some(bundle_id)).is_some();
        }

        fn is_website_blocked(&self, domain: &str) -> bool {
            return self.check_website(domain).is_some();
        }
    }

    fn make_blocker(profiles: Vec<ResolutionProfile>) -> Blocker {
        return Blocker {
            profiles,
            active_violation: None,
        };
    }

    #[test]
    fn test_no_profiles_means_not_blocked() {
        let blocker = make_blocker(vec![]);
        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }
}
