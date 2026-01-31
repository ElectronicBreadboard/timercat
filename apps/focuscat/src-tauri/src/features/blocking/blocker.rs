use super::config::BlockingConfig;
use super::types::{BlockingViolationDto, BlockingViolationEvent};
use crate::app::window::Window;
use crate::common::url::extract_domain;
use crate::features::focus_profile::repository::FocusProfileWithRelations;
use crate::features::focus_profile::types::RuleAction;
use tauri::AppHandle;
use tauri_specta::Event;

pub struct Blocker {
    profiles: Vec<ResolvedProfile>,
    active_violation: Option<BlockingViolation>,
}

impl Blocker {
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

        // Hide overlay if not blocked
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

    /// Current active violation.
    pub fn active_violation(&self) -> Option<BlockingViolation> {
        return self.active_violation.clone();
    }

    /// Set profiles from fetched data.
    pub fn set_profiles(&mut self, data: Vec<FocusProfileWithRelations>) {
        self.profiles = data.into_iter().map(ResolvedProfile::from).collect();
    }

    pub(crate) fn empty() -> Self {
        return Self {
            profiles: Vec::new(),
            active_violation: None,
        };
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

    /// Check if an app is blocked by any active profile.
    fn check_app(&self, bundle_id: Option<&str>) -> Option<BlockingViolation> {
        let bid = bundle_id?;
        return self.profiles.iter().find_map(|profile| {
            if profile.is_app_blocked(bid) {
                Some(BlockingViolation {
                    profile_name: profile.name.clone(),
                    profile_color: profile.color.clone(),
                    blocked_target: BlockedTarget::App {
                        bundle_id: bid.to_string(),
                    },
                })
            } else {
                None
            }
        });
    }

    /// Check if a window is blocked (app + browser URL).
    fn check_window(
        &self,
        bundle_id: Option<&str>,
        browser_url: Option<&str>,
    ) -> Option<BlockingViolation> {
        if let Some(violation) = self.check_app(bundle_id) {
            return Some(violation);
        }

        if let Some(url) = browser_url {
            if let Some(domain) = extract_domain(url) {
                return self.profiles.iter().find_map(|profile| {
                    if profile.is_website_blocked(&domain) {
                        Some(BlockingViolation {
                            profile_name: profile.name.clone(),
                            profile_color: profile.color.clone(),
                            blocked_target: BlockedTarget::Website {
                                domain: domain.clone(),
                            },
                        })
                    } else {
                        None
                    }
                });
            }
        }

        return None;
    }

    /// Store violation and emit event.
    fn set_violation(&mut self, app: &AppHandle, violation: Option<BlockingViolation>) {
        self.active_violation = violation.clone();
        let dto = violation.map(BlockingViolationDto::from);
        let _ = BlockingViolationEvent(dto).emit(app);
    }
}

/// A blocking violation detected by the blocker.
#[derive(Debug, Clone)]
pub struct BlockingViolation {
    pub profile_name: String,
    pub profile_color: Option<String>,
    pub blocked_target: BlockedTarget,
}

/// The target that was blocked.
#[derive(Debug, Clone)]
pub enum BlockedTarget {
    App { bundle_id: String },
    Website { domain: String },
}

// MARK: - ResolvedProfile

/// A profile's rules flattened for fast matching.
struct ResolvedProfile {
    name: String,
    color: Option<String>,
    rules: Vec<ResolvedRule>,
}

impl ResolvedProfile {
    /// Check if this profile blocks the given app.
    ///
    /// - Block rules: app is blocked if it matches any Block target.
    /// - Allow rules: app is blocked if it does NOT match any Allow target.
    fn is_app_blocked(&self, bundle_id: &str) -> bool {
        if self.rules.is_empty() {
            return false;
        }

        let has_allow_rules = self
            .rules
            .iter()
            .any(|r| matches!(r.action, RuleAction::Allow) && r.target.is_app_relevant());

        if has_allow_rules {
            // Allowlist mode: blocked if NOT in any Allow rule
            let is_allowed = self
                .rules
                .iter()
                .any(|r| matches!(r.action, RuleAction::Allow) && r.target.matches_app(bundle_id));
            return !is_allowed;
        }

        // Blocklist mode: blocked if in any Block rule
        return self
            .rules
            .iter()
            .any(|r| matches!(r.action, RuleAction::Block) && r.target.matches_app(bundle_id));
    }

    /// Check if this profile blocks the given website.
    ///
    /// - Block rules: site is blocked if it matches any Block target.
    /// - Allow rules: site is blocked if it does NOT match any Allow target.
    fn is_website_blocked(&self, domain: &str) -> bool {
        if self.rules.is_empty() {
            return false;
        }

        let has_allow_rules = self
            .rules
            .iter()
            .any(|r| matches!(r.action, RuleAction::Allow) && r.target.is_website_relevant());

        if has_allow_rules {
            // Allowlist mode: blocked if NOT in any Allow rule
            let is_allowed = self
                .rules
                .iter()
                .any(|r| matches!(r.action, RuleAction::Allow) && r.target.matches_website(domain));
            return !is_allowed;
        }

        // Blocklist mode: blocked if in any Block rule
        return self
            .rules
            .iter()
            .any(|r| matches!(r.action, RuleAction::Block) && r.target.matches_website(domain));
    }
}

// MARK: - ResolvedRule

struct ResolvedRule {
    action: RuleAction,
    target: ResolvedTarget,
}

enum ResolvedTarget {
    App { bundle_id: String },
    Website { domain: String },
    All,
}

impl ResolvedTarget {
    fn is_app_relevant(&self) -> bool {
        return matches!(self, ResolvedTarget::App { .. } | ResolvedTarget::All);
    }

    fn is_website_relevant(&self) -> bool {
        return matches!(self, ResolvedTarget::Website { .. } | ResolvedTarget::All);
    }

    fn matches_app(&self, bundle_id: &str) -> bool {
        return match self {
            ResolvedTarget::App {
                bundle_id: rule_bid,
            } => rule_bid == bundle_id,
            ResolvedTarget::All => true,
            ResolvedTarget::Website { .. } => false,
        };
    }

    fn matches_website(&self, domain: &str) -> bool {
        return match self {
            ResolvedTarget::Website {
                domain: rule_domain,
            } => rule_domain == domain,
            ResolvedTarget::All => true,
            ResolvedTarget::App { .. } => false,
        };
    }
}

// MARK: - Conversions

impl From<FocusProfileWithRelations> for ResolvedProfile {
    fn from(data: FocusProfileWithRelations) -> Self {
        let name = data.profile.name;
        let color = data.profile.color;
        let rules = data
            .rules
            .into_iter()
            .map(|row| {
                let action = RuleAction::from_str(&row.action).unwrap_or(RuleAction::Block);
                let target = if let Some(bundle_id) = row.app_bundle_id {
                    ResolvedTarget::App { bundle_id }
                } else if let Some(domain) = row.website_domain {
                    ResolvedTarget::Website { domain }
                } else {
                    ResolvedTarget::All
                };
                ResolvedRule { action, target }
            })
            .collect();

        return Self { name, color, rules };
    }
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;

    impl Blocker {
        fn is_app_blocked(&self, bundle_id: &str) -> bool {
            return self
                .profiles
                .iter()
                .any(|profile| profile.is_app_blocked(bundle_id));
        }

        fn is_website_blocked(&self, domain: &str) -> bool {
            return self
                .profiles
                .iter()
                .any(|profile| profile.is_website_blocked(domain));
        }
    }

    fn make_blocker(profiles: Vec<ResolvedProfile>) -> Blocker {
        return Blocker {
            profiles,
            active_violation: None,
        };
    }

    fn block_app(bundle_id: &str) -> ResolvedRule {
        return ResolvedRule {
            action: RuleAction::Block,
            target: ResolvedTarget::App {
                bundle_id: bundle_id.to_string(),
            },
        };
    }

    fn allow_app(bundle_id: &str) -> ResolvedRule {
        return ResolvedRule {
            action: RuleAction::Allow,
            target: ResolvedTarget::App {
                bundle_id: bundle_id.to_string(),
            },
        };
    }

    fn block_website(domain: &str) -> ResolvedRule {
        return ResolvedRule {
            action: RuleAction::Block,
            target: ResolvedTarget::Website {
                domain: domain.to_string(),
            },
        };
    }

    fn allow_website(domain: &str) -> ResolvedRule {
        return ResolvedRule {
            action: RuleAction::Allow,
            target: ResolvedTarget::Website {
                domain: domain.to_string(),
            },
        };
    }

    fn block_all() -> ResolvedRule {
        return ResolvedRule {
            action: RuleAction::Block,
            target: ResolvedTarget::All,
        };
    }

    fn allow_all() -> ResolvedRule {
        return ResolvedRule {
            action: RuleAction::Allow,
            target: ResolvedTarget::All,
        };
    }

    #[test]
    fn test_no_profiles_means_not_blocked() {
        let blocker = make_blocker(vec![]);
        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_blocklist_blocks_matching_app() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![
                block_app("com.apple.Calculator"),
                block_app("com.discord.Discord"),
            ],
        }]);

        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(blocker.is_app_blocked("com.discord.Discord"));
        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
    }

    #[test]
    fn test_blocklist_blocks_matching_website() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![block_website("youtube.com"), block_website("twitter.com")],
        }]);

        assert!(blocker.is_website_blocked("youtube.com"));
        assert!(blocker.is_website_blocked("twitter.com"));
        assert!(!blocker.is_website_blocked("github.com"));
    }

    #[test]
    fn test_allowlist_blocks_non_matching_app() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![
                allow_app("com.microsoft.VSCode"),
                allow_app("com.apple.Terminal"),
            ],
        }]);

        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
        assert!(!blocker.is_app_blocked("com.apple.Terminal"));
        assert!(blocker.is_app_blocked("com.apple.Calculator"));
    }

    #[test]
    fn test_allowlist_blocks_non_matching_website() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![allow_website("github.com"), allow_website("docs.rs")],
        }]);

        assert!(!blocker.is_website_blocked("github.com"));
        assert!(!blocker.is_website_blocked("docs.rs"));
        assert!(blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_block_all_blocks_everything() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![block_all()],
        }]);

        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_allow_all_blocks_nothing() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![allow_all()],
        }]);

        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_empty_profile_blocks_nothing() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![],
        }]);

        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_multiple_profiles_union_blocking() {
        let blocker = make_blocker(vec![
            ResolvedProfile {
                name: "Test".to_string(),
                color: None,
                rules: vec![block_app("com.apple.Calculator")],
            },
            ResolvedProfile {
                name: "Test2".to_string(),
                color: None,
                rules: vec![allow_website("github.com")],
            },
        ]);

        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
        assert!(!blocker.is_website_blocked("github.com"));
        assert!(blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_app_rules_dont_affect_websites() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![block_app("com.apple.Calculator")],
        }]);

        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("calculator.com"));
    }

    #[test]
    fn test_website_rules_dont_affect_apps() {
        let blocker = make_blocker(vec![ResolvedProfile {
            name: "Test".to_string(),
            color: None,
            rules: vec![block_website("youtube.com")],
        }]);

        assert!(blocker.is_website_blocked("youtube.com"));
        assert!(!blocker.is_app_blocked("com.google.YouTube"));
    }
}
