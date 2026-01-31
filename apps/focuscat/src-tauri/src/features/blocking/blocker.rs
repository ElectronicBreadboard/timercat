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

    pub fn set_profiles(&mut self, data: Vec<(FocusProfileWithRelations, i32)>) {
        self.profiles = data
            .into_iter()
            .map(|(profile, priority)| ResolvedProfile::new(profile, priority))
            .collect();
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
        let (profile, action) = self.resolve(|t| t.matches_app(bid))?;
        if matches!(action, RuleAction::Block) {
            return Some(BlockingViolation {
                profile_id: profile.id,
                profile_name: profile.name.clone(),
                profile_color: profile.color.clone(),
                blocked_target: BlockedTarget::App {
                    bundle_id: bid.to_string(),
                },
            });
        }
        return None;
    }

    /// Check if a website is blocked.
    fn check_website(&self, domain: &str) -> Option<BlockingViolation> {
        let (profile, action) = self.resolve(|t| t.matches_website(domain))?;
        if matches!(action, RuleAction::Block) {
            return Some(BlockingViolation {
                profile_id: profile.id,
                profile_name: profile.name.clone(),
                profile_color: profile.color.clone(),
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

    /// Priority-based resolution across all profiles.
    ///
    /// 1. Collect all matching rules from all profiles
    /// 2. Rule from highest priority profile wins
    /// 3. Same priority: block wins (fail-safe)
    /// 4. No matching rule: allowed (default)
    fn resolve(
        &self,
        matcher: impl Fn(&ResolvedTarget) -> bool,
    ) -> Option<(&ResolvedProfile, &RuleAction)> {
        let mut winner: Option<(&ResolvedProfile, &RuleAction)> = None;

        for profile in &self.profiles {
            for rule in &profile.rules {
                if !matcher(&rule.target) {
                    continue;
                }

                let is_new_winner = match &winner {
                    None => true,
                    Some((best, best_action)) => {
                        if profile.priority > best.priority {
                            true
                        } else if profile.priority == best.priority {
                            // Same priority: block wins over allow
                            matches!(rule.action, RuleAction::Block)
                                && matches!(best_action, RuleAction::Allow)
                        } else {
                            false
                        }
                    }
                };

                if is_new_winner {
                    winner = Some((profile, &rule.action));
                }
            }
        }

        return winner;
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

// MARK: - ResolvedProfile

struct ResolvedProfile {
    id: i64,
    name: String,
    color: Option<String>,
    priority: i32,
    rules: Vec<ResolvedRule>,
}

impl ResolvedProfile {
    fn new(data: FocusProfileWithRelations, priority: i32) -> Self {
        let id = data.profile.id;
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

        return Self {
            id,
            name,
            color,
            priority,
            rules,
        };
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

    fn make_blocker(profiles: Vec<ResolvedProfile>) -> Blocker {
        return Blocker {
            profiles,
            active_violation: None,
        };
    }

    fn profile(name: &str, priority: i32, rules: Vec<ResolvedRule>) -> ResolvedProfile {
        return ResolvedProfile {
            id: 0,
            name: name.to_string(),
            color: None,
            priority,
            rules,
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
    fn test_no_matching_rules_means_not_blocked() {
        let blocker = make_blocker(vec![profile(
            "Test",
            0,
            vec![block_app("com.apple.Calculator")],
        )]);
        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
    }

    #[test]
    fn test_block_app_blocks_matching() {
        let blocker = make_blocker(vec![profile(
            "Test",
            0,
            vec![
                block_app("com.apple.Calculator"),
                block_app("com.discord.Discord"),
            ],
        )]);

        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(blocker.is_app_blocked("com.discord.Discord"));
        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
    }

    #[test]
    fn test_block_website_blocks_matching() {
        let blocker = make_blocker(vec![profile(
            "Test",
            0,
            vec![block_website("youtube.com"), block_website("twitter.com")],
        )]);

        assert!(blocker.is_website_blocked("youtube.com"));
        assert!(blocker.is_website_blocked("twitter.com"));
        assert!(!blocker.is_website_blocked("github.com"));
    }

    #[test]
    fn test_block_all_blocks_everything() {
        let blocker = make_blocker(vec![profile("Test", 0, vec![block_all()])]);
        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_empty_profile_blocks_nothing() {
        let blocker = make_blocker(vec![profile("Test", 0, vec![])]);
        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_allow_all_blocks_nothing() {
        let blocker = make_blocker(vec![profile("Test", 0, vec![allow_all()])]);
        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_app_rules_dont_affect_websites() {
        let blocker = make_blocker(vec![profile(
            "Test",
            0,
            vec![block_app("com.apple.Calculator")],
        )]);
        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_website_blocked("calculator.com"));
    }

    #[test]
    fn test_website_rules_dont_affect_apps() {
        let blocker = make_blocker(vec![profile("Test", 0, vec![block_website("youtube.com")])]);
        assert!(blocker.is_website_blocked("youtube.com"));
        assert!(!blocker.is_app_blocked("com.google.YouTube"));
    }

    #[test]
    fn test_higher_priority_allow_overrides_block() {
        let blocker = make_blocker(vec![
            profile("Block", 0, vec![block_app("com.apple.Calculator")]),
            profile("Allow", 1, vec![allow_app("com.apple.Calculator")]),
        ]);
        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
    }

    #[test]
    fn test_same_priority_block_wins_over_allow() {
        let blocker = make_blocker(vec![
            profile("Allow", 0, vec![allow_app("com.apple.Calculator")]),
            profile("Block", 0, vec![block_app("com.apple.Calculator")]),
        ]);
        assert!(blocker.is_app_blocked("com.apple.Calculator"));
    }

    /// Blocklist: "No Social Media" (blocks twitter, facebook)
    ///   -> those sites blocked, everything else allowed
    #[test]
    fn test_blocklist_pattern() {
        let blocker = make_blocker(vec![profile(
            "No Social Media",
            0,
            vec![block_website("twitter.com"), block_website("facebook.com")],
        )]);

        assert!(blocker.is_website_blocked("twitter.com"));
        assert!(blocker.is_website_blocked("facebook.com"));
        assert!(!blocker.is_website_blocked("github.com"));
    }

    /// Exception: "No Social Media" (pri 0) + "Allow Twitter" (pri 1)
    ///   -> facebook blocked, twitter allowed
    #[test]
    fn test_exception_pattern() {
        let blocker = make_blocker(vec![
            profile(
                "No Social Media",
                0,
                vec![block_website("twitter.com"), block_website("facebook.com")],
            ),
            profile("Allow Twitter", 1, vec![allow_website("twitter.com")]),
        ]);

        assert!(!blocker.is_website_blocked("twitter.com"));
        assert!(blocker.is_website_blocked("facebook.com"));
        assert!(!blocker.is_website_blocked("github.com"));
    }

    /// Whitelist: "Block All" (pri 0) + "Coding Apps" (pri 1)
    ///   -> only coding apps allowed, rest blocked
    #[test]
    fn test_whitelist_pattern() {
        let blocker = make_blocker(vec![
            profile("Block All", 0, vec![block_all()]),
            profile(
                "Coding Apps",
                1,
                vec![
                    allow_app("com.microsoft.VSCode"),
                    allow_app("com.apple.Terminal"),
                ],
            ),
        ]);

        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
        assert!(!blocker.is_app_blocked("com.apple.Terminal"));
        assert!(blocker.is_app_blocked("com.apple.Calculator"));
        // Block All also blocks websites
        assert!(blocker.is_website_blocked("youtube.com"));
    }

    /// Break: "Allow All" (pri 99) overrides everything
    #[test]
    fn test_break_pattern() {
        let blocker = make_blocker(vec![
            profile("Block All", 0, vec![block_all()]),
            profile("Coding Apps", 1, vec![allow_app("com.microsoft.VSCode")]),
            profile("Break", 99, vec![allow_all()]),
        ]);

        assert!(!blocker.is_app_blocked("com.apple.Calculator"));
        assert!(!blocker.is_app_blocked("com.microsoft.VSCode"));
        assert!(!blocker.is_website_blocked("youtube.com"));
    }
}
