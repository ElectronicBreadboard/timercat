use crate::common::url::extract_domain;
use crate::features::focus_profile::repository::{
    FocusProfileRepository, FocusProfileWithRelations,
};
use crate::features::focus_profile::types::RuleAction;
use sqlx::SqlitePool;

pub struct BlockingChecker {
    profiles: Vec<ResolvedProfile>,
}

impl BlockingChecker {
    /// Check an app activation for blocking violations.
    pub fn check_app(&self, bundle_id: Option<&str>) {
        if let Some(bid) = bundle_id {
            if self.is_app_blocked(bid) {
                println!("[Blocking] App blocked: {}", bid);
            }
        }
    }

    /// Check a window focus event for blocking violations.
    /// Checks both the app and browser URL (if present).
    pub fn check_window(&self, bundle_id: Option<&str>, browser_url: Option<&str>) {
        self.check_app(bundle_id);

        if let Some(url) = browser_url {
            if let Some(domain) = extract_domain(url) {
                if self.is_website_blocked(&domain) {
                    println!("[Blocking] Website blocked: {} (url: {})", domain, url);
                }
            }
        }
    }

    /// Check if an app (by bundle_id) is blocked by any active profile.
    pub fn is_app_blocked(&self, bundle_id: &str) -> bool {
        self.profiles
            .iter()
            .any(|profile| profile.is_app_blocked(bundle_id))
    }

    /// Check if a website (by domain) is blocked by any active profile.
    pub fn is_website_blocked(&self, domain: &str) -> bool {
        self.profiles
            .iter()
            .any(|profile| profile.is_website_blocked(domain))
    }

    pub(crate) fn empty() -> Self {
        return Self {
            profiles: Vec::new(),
        };
    }

    /// Refresh by querying active profiles from the database.
    pub async fn refresh(pool: &SqlitePool) -> Self {
        let active = match FocusProfileRepository::get_active(pool).await {
            Ok(profiles) => profiles,
            Err(e) => {
                eprintln!("[Blocking] Failed to fetch active profiles: {}", e);
                return Self::empty();
            }
        };

        let profiles = active.into_iter().map(ResolvedProfile::from).collect();
        return Self { profiles };
    }
}

/// A profile's rules flattened for fast matching.
struct ResolvedProfile {
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
    /// Whether this target is relevant to app blocking (App or All).
    fn is_app_relevant(&self) -> bool {
        matches!(self, ResolvedTarget::App { .. } | ResolvedTarget::All)
    }

    /// Whether this target is relevant to website blocking (Website or All).
    fn is_website_relevant(&self) -> bool {
        matches!(self, ResolvedTarget::Website { .. } | ResolvedTarget::All)
    }

    /// Check if this target matches a specific app bundle_id.
    fn matches_app(&self, bundle_id: &str) -> bool {
        match self {
            ResolvedTarget::App {
                bundle_id: rule_bid,
            } => rule_bid == bundle_id,
            ResolvedTarget::All => true,
            ResolvedTarget::Website { .. } => false,
        }
    }

    /// Check if this target matches a specific website domain.
    fn matches_website(&self, domain: &str) -> bool {
        match self {
            ResolvedTarget::Website {
                domain: rule_domain,
            } => rule_domain == domain,
            ResolvedTarget::All => true,
            ResolvedTarget::App { .. } => false,
        }
    }
}

// MARK: - Conversions

impl From<FocusProfileWithRelations> for ResolvedProfile {
    fn from(data: FocusProfileWithRelations) -> Self {
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

        return Self { rules };
    }
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;

    fn make_checker(profiles: Vec<ResolvedProfile>) -> BlockingChecker {
        BlockingChecker { profiles }
    }

    fn block_app(bundle_id: &str) -> ResolvedRule {
        ResolvedRule {
            action: RuleAction::Block,
            target: ResolvedTarget::App {
                bundle_id: bundle_id.to_string(),
            },
        }
    }

    fn allow_app(bundle_id: &str) -> ResolvedRule {
        ResolvedRule {
            action: RuleAction::Allow,
            target: ResolvedTarget::App {
                bundle_id: bundle_id.to_string(),
            },
        }
    }

    fn block_website(domain: &str) -> ResolvedRule {
        ResolvedRule {
            action: RuleAction::Block,
            target: ResolvedTarget::Website {
                domain: domain.to_string(),
            },
        }
    }

    fn allow_website(domain: &str) -> ResolvedRule {
        ResolvedRule {
            action: RuleAction::Allow,
            target: ResolvedTarget::Website {
                domain: domain.to_string(),
            },
        }
    }

    fn block_all() -> ResolvedRule {
        ResolvedRule {
            action: RuleAction::Block,
            target: ResolvedTarget::All,
        }
    }

    fn allow_all() -> ResolvedRule {
        ResolvedRule {
            action: RuleAction::Allow,
            target: ResolvedTarget::All,
        }
    }

    #[test]
    fn test_no_profiles_means_not_blocked() {
        let checker = make_checker(vec![]);
        assert!(!checker.is_app_blocked("com.apple.Calculator"));
        assert!(!checker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_blocklist_blocks_matching_app() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![
                block_app("com.apple.Calculator"),
                block_app("com.discord.Discord"),
            ],
        }]);

        assert!(checker.is_app_blocked("com.apple.Calculator"));
        assert!(checker.is_app_blocked("com.discord.Discord"));
        assert!(!checker.is_app_blocked("com.microsoft.VSCode"));
    }

    #[test]
    fn test_blocklist_blocks_matching_website() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![block_website("youtube.com"), block_website("twitter.com")],
        }]);

        assert!(checker.is_website_blocked("youtube.com"));
        assert!(checker.is_website_blocked("twitter.com"));
        assert!(!checker.is_website_blocked("github.com"));
    }

    #[test]
    fn test_allowlist_blocks_non_matching_app() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![
                allow_app("com.microsoft.VSCode"),
                allow_app("com.apple.Terminal"),
            ],
        }]);

        assert!(!checker.is_app_blocked("com.microsoft.VSCode"));
        assert!(!checker.is_app_blocked("com.apple.Terminal"));
        assert!(checker.is_app_blocked("com.apple.Calculator"));
    }

    #[test]
    fn test_allowlist_blocks_non_matching_website() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![allow_website("github.com"), allow_website("docs.rs")],
        }]);

        assert!(!checker.is_website_blocked("github.com"));
        assert!(!checker.is_website_blocked("docs.rs"));
        assert!(checker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_block_all_blocks_everything() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![block_all()],
        }]);

        assert!(checker.is_app_blocked("com.apple.Calculator"));
        assert!(checker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_allow_all_blocks_nothing() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![allow_all()],
        }]);

        assert!(!checker.is_app_blocked("com.apple.Calculator"));
        assert!(!checker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_empty_profile_blocks_nothing() {
        let checker = make_checker(vec![ResolvedProfile { rules: vec![] }]);

        assert!(!checker.is_app_blocked("com.apple.Calculator"));
        assert!(!checker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_multiple_profiles_union_blocking() {
        // Profile 1: blocklist for apps
        // Profile 2: allowlist for websites
        let checker = make_checker(vec![
            ResolvedProfile {
                rules: vec![block_app("com.apple.Calculator")],
            },
            ResolvedProfile {
                rules: vec![allow_website("github.com")],
            },
        ]);

        // Calculator blocked by profile 1
        assert!(checker.is_app_blocked("com.apple.Calculator"));
        // VSCode not blocked (profile 1 doesn't block it, profile 2 has no app rules)
        assert!(!checker.is_app_blocked("com.microsoft.VSCode"));
        // github.com allowed by profile 2
        assert!(!checker.is_website_blocked("github.com"));
        // youtube.com blocked by profile 2 (allowlist, not in list)
        assert!(checker.is_website_blocked("youtube.com"));
    }

    #[test]
    fn test_app_rules_dont_affect_websites() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![block_app("com.apple.Calculator")],
        }]);

        assert!(checker.is_app_blocked("com.apple.Calculator"));
        // Website should not be affected by app-only rules
        assert!(!checker.is_website_blocked("calculator.com"));
    }

    #[test]
    fn test_website_rules_dont_affect_apps() {
        let checker = make_checker(vec![ResolvedProfile {
            rules: vec![block_website("youtube.com")],
        }]);

        assert!(checker.is_website_blocked("youtube.com"));
        // App should not be affected by website-only rules
        assert!(!checker.is_app_blocked("com.google.YouTube"));
    }
}
