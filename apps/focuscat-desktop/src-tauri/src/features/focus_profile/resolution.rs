use super::repository::{FocusProfileRuleRow, FocusProfileScheduleRow, FocusProfileWithRelations};
use super::types::{RuleAction, ScheduleMode};
use std::collections::HashMap;

/// Resolve rules from profiles. Higher priority wins; same priority: block wins over allow.
pub fn resolve_rules(profiles: &[(&FocusProfileWithRelations, i64)]) -> ResolvedRules {
    let resolution_profiles = to_resolution_profiles(profiles);
    return resolve_rules_from_profiles(&resolution_profiles);
}

/// Resolve action for an app. Returns (action, winning profile) when a rule matches.
/// Returns None if no rule matches (default = allowed).
pub fn resolve_for_app<'a>(
    bundle_id: &str,
    profiles: &'a [ResolutionProfile],
) -> Option<(RuleAction, &'a ResolutionProfile)> {
    let key = TargetKey::App {
        bundle_id: bundle_id.to_string(),
    };
    return resolve_for_target(&key, profiles);
}

/// Resolve action for a website. Returns (action, winning profile) when a rule matches.
pub fn resolve_for_website<'a>(
    domain: &str,
    profiles: &'a [ResolutionProfile],
) -> Option<(RuleAction, &'a ResolutionProfile)> {
    let key = TargetKey::Website {
        domain: domain.to_string(),
    };
    return resolve_for_target(&key, profiles);
}

/// True if any always_on schedule matches the current day and time.
pub fn is_always_on_now(
    schedules: &[FocusProfileScheduleRow],
    current_day: i32,
    current_time: &str,
) -> bool {
    schedules.iter().any(|s| {
        if s.mode != ScheduleMode::AlwaysOn.as_str() {
            return false;
        }
        let days: Vec<i32> = serde_json::from_str(&s.days).unwrap_or_default();
        if !days.contains(&current_day) {
            return false;
        }
        if s.start_time <= s.end_time {
            s.start_time.as_str() <= current_time && current_time < s.end_time.as_str()
        } else {
            current_time >= s.start_time.as_str() || current_time < s.end_time.as_str()
        }
    })
}

pub fn to_resolution_profiles(
    profiles: &[(&FocusProfileWithRelations, i64)],
) -> Vec<ResolutionProfile> {
    return profiles
        .iter()
        .map(|(profile, priority)| {
            let rules = profile
                .rules
                .iter()
                .map(|r| ResolutionRule {
                    target_key: rule_target_key(r),
                    action: RuleAction::from_str(&r.action).unwrap_or(RuleAction::Block),
                    target: rule_to_resolved_target(r),
                })
                .collect();
            ResolutionProfile {
                priority: *priority,
                profile_id: profile.profile.id,
                profile_name: profile.profile.name.clone(),
                profile_color: profile.profile.color.clone(),
                rules,
            }
        })
        .collect();
}

/// Priority-based: higher wins. Same priority: block wins over allow. All matches every target.
fn resolve_rules_from_profiles(profiles: &[ResolutionProfile]) -> ResolvedRules {
    if profiles.is_empty() {
        return ResolvedRules {
            blocked: vec![],
            allowed: vec![],
        };
    }

    let mut targets: HashMap<TargetKey, ResolvedTarget> = HashMap::new();
    for profile in profiles {
        for rule in &profile.rules {
            if !targets.contains_key(&rule.target_key) {
                targets.insert(rule.target_key.clone(), rule.target.clone());
            }
        }
    }

    let mut blocked: Vec<ResolvedTarget> = Vec::new();
    let mut allowed: Vec<ResolvedTarget> = Vec::new();
    let mut has_block_all = false;

    for (key, target) in &targets {
        if let Some((action, _)) = resolve_for_target(key, profiles) {
            match action {
                RuleAction::Block => {
                    if matches!(key, TargetKey::All) {
                        has_block_all = true;
                    }
                    blocked.push(target.clone());
                }
                RuleAction::Allow => {
                    allowed.push(target.clone());
                }
            }
        }
    }

    // Only show allowed when block_all exists (whitelist mode)
    if !has_block_all {
        allowed.clear();
    }

    return ResolvedRules { blocked, allowed };
}

fn resolve_for_target<'a>(
    check_key: &TargetKey,
    profiles: &'a [ResolutionProfile],
) -> Option<(RuleAction, &'a ResolutionProfile)> {
    let mut winner: Option<(&ResolutionProfile, i64, RuleAction)> = None;

    for profile in profiles {
        for rule in &profile.rules {
            if !rule.target_key.matches(check_key) {
                continue;
            }

            let is_new_winner = match &winner {
                None => true,
                Some((_, wp, wa)) => {
                    profile.priority > *wp
                        || (profile.priority == *wp
                            && matches!(rule.action, RuleAction::Block)
                            && matches!(wa, RuleAction::Allow))
                }
            };

            if is_new_winner {
                winner = Some((profile, profile.priority, rule.action.clone()));
            }
        }
    }

    return winner.map(|(p, _, a)| (a, p));
}

fn rule_target_key(rule: &FocusProfileRuleRow) -> TargetKey {
    if let Some(ref bundle_id) = rule.app_bundle_id {
        return TargetKey::App {
            bundle_id: bundle_id.clone(),
        };
    }
    if let Some(ref domain) = rule.website_domain {
        return TargetKey::Website {
            domain: domain.clone(),
        };
    }
    return TargetKey::All;
}

fn rule_to_resolved_target(rule: &FocusProfileRuleRow) -> ResolvedTarget {
    if let Some(ref bundle_id) = rule.app_bundle_id {
        ResolvedTarget::App {
            bundle_id: bundle_id.clone(),
            name: rule.app_name.clone(),
            icon: rule.app_icon.clone(),
            color: rule.app_color.clone(),
        }
    } else if let Some(ref domain) = rule.website_domain {
        ResolvedTarget::Website {
            domain: domain.clone(),
            name: rule.website_name.clone(),
            icon: rule.website_icon.clone(),
            color: rule.website_color.clone(),
        }
    } else {
        ResolvedTarget::All
    }
}

pub struct ResolutionProfile {
    pub priority: i64,
    pub profile_id: i64,
    pub profile_name: String,
    pub profile_color: Option<String>,
    pub rules: Vec<ResolutionRule>,
}

pub struct ResolutionRule {
    pub target_key: TargetKey,
    pub action: RuleAction,
    pub target: ResolvedTarget,
}

pub struct ResolvedRules {
    pub blocked: Vec<ResolvedTarget>,
    pub allowed: Vec<ResolvedTarget>,
}

#[derive(Debug, Clone)]
pub enum ResolvedTarget {
    All,
    App {
        bundle_id: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
    Website {
        domain: String,
        name: Option<String>,
        icon: Option<String>,
        color: Option<String>,
    },
}

/// Target identity for matching. All matches every target.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TargetKey {
    All,
    App { bundle_id: String },
    Website { domain: String },
}

impl TargetKey {
    /// True if this rule target matches the check target. All matches everything.
    fn matches(&self, other: &TargetKey) -> bool {
        match (self, other) {
            (TargetKey::All, _) | (_, TargetKey::All) => true,
            (TargetKey::App { bundle_id: a }, TargetKey::App { bundle_id: b }) => a == b,
            (TargetKey::Website { domain: a }, TargetKey::Website { domain: b }) => a == b,
            _ => false,
        }
    }
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::focus_profile::types::RuleAction;

    fn profile(name: &str, priority: i32, rules: Vec<(&str, RuleAction)>) -> ResolutionProfile {
        let rules: Vec<ResolutionRule> = rules
            .into_iter()
            .map(|(key, action)| {
                let (target_key, target) = parse_target_key(key);
                ResolutionRule {
                    target_key,
                    action,
                    target,
                }
            })
            .collect();
        return ResolutionProfile {
            priority: priority as i64,
            profile_id: 0,
            profile_name: name.to_string(),
            profile_color: None,
            rules,
        };
    }

    fn parse_target_key(key: &str) -> (TargetKey, ResolvedTarget) {
        return match key {
            "all" => (TargetKey::All, ResolvedTarget::All),
            k if k.starts_with("app:") => {
                let bid = k.strip_prefix("app:").unwrap_or(k).to_string();
                (
                    TargetKey::App {
                        bundle_id: bid.clone(),
                    },
                    ResolvedTarget::App {
                        bundle_id: bid,
                        name: None,
                        icon: None,
                        color: None,
                    },
                )
            }
            k if k.starts_with("website:") => {
                let dom = k.strip_prefix("website:").unwrap_or(k).to_string();
                (
                    TargetKey::Website {
                        domain: dom.clone(),
                    },
                    ResolvedTarget::Website {
                        domain: dom,
                        name: None,
                        icon: None,
                        color: None,
                    },
                )
            }
            _ => (TargetKey::All, ResolvedTarget::All),
        };
    }

    fn is_app_blocked(profiles: &[ResolutionProfile], bundle_id: &str) -> bool {
        return matches!(
            resolve_for_app(bundle_id, profiles),
            Some((RuleAction::Block, _))
        );
    }

    fn is_website_blocked(profiles: &[ResolutionProfile], domain: &str) -> bool {
        return matches!(
            resolve_for_website(domain, profiles),
            Some((RuleAction::Block, _))
        );
    }

    #[test]
    fn test_no_profiles_means_not_blocked() {
        let profiles: Vec<ResolutionProfile> = vec![];
        assert!(!is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(!is_website_blocked(&profiles, "youtube.com"));
    }

    #[test]
    fn test_no_matching_rules_means_not_blocked() {
        let profiles = vec![profile(
            "Test",
            0,
            vec![("app:com.apple.Calculator", RuleAction::Block)],
        )];
        assert!(!is_app_blocked(&profiles, "com.microsoft.VSCode"));
    }

    #[test]
    fn test_block_app_blocks_matching() {
        let profiles = vec![profile(
            "Test",
            0,
            vec![
                ("app:com.apple.Calculator", RuleAction::Block),
                ("app:com.discord.Discord", RuleAction::Block),
            ],
        )];
        assert!(is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(is_app_blocked(&profiles, "com.discord.Discord"));
        assert!(!is_app_blocked(&profiles, "com.microsoft.VSCode"));
    }

    #[test]
    fn test_block_website_blocks_matching() {
        let profiles = vec![profile(
            "Test",
            0,
            vec![
                ("website:youtube.com", RuleAction::Block),
                ("website:twitter.com", RuleAction::Block),
            ],
        )];
        assert!(is_website_blocked(&profiles, "youtube.com"));
        assert!(is_website_blocked(&profiles, "twitter.com"));
        assert!(!is_website_blocked(&profiles, "github.com"));
    }

    #[test]
    fn test_block_all_blocks_everything() {
        let profiles = vec![profile("Test", 0, vec![("all", RuleAction::Block)])];
        assert!(is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(is_website_blocked(&profiles, "youtube.com"));
    }

    #[test]
    fn test_empty_profile_blocks_nothing() {
        let profiles = vec![profile("Test", 0, vec![])];
        assert!(!is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(!is_website_blocked(&profiles, "youtube.com"));
    }

    #[test]
    fn test_allow_all_blocks_nothing() {
        let profiles = vec![profile("Test", 0, vec![("all", RuleAction::Allow)])];
        assert!(!is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(!is_website_blocked(&profiles, "youtube.com"));
    }

    #[test]
    fn test_app_rules_dont_affect_websites() {
        let profiles = vec![profile(
            "Test",
            0,
            vec![("app:com.apple.Calculator", RuleAction::Block)],
        )];
        assert!(is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(!is_website_blocked(&profiles, "calculator.com"));
    }

    #[test]
    fn test_website_rules_dont_affect_apps() {
        let profiles = vec![profile(
            "Test",
            0,
            vec![("website:youtube.com", RuleAction::Block)],
        )];
        assert!(is_website_blocked(&profiles, "youtube.com"));
        assert!(!is_app_blocked(&profiles, "com.google.YouTube"));
    }

    #[test]
    fn test_higher_priority_allow_overrides_block() {
        let profiles = vec![
            profile(
                "Block",
                0,
                vec![("app:com.apple.Calculator", RuleAction::Block)],
            ),
            profile(
                "Allow",
                1,
                vec![("app:com.apple.Calculator", RuleAction::Allow)],
            ),
        ];
        assert!(!is_app_blocked(&profiles, "com.apple.Calculator"));
    }

    #[test]
    fn test_same_priority_block_wins_over_allow() {
        let profiles = vec![
            profile(
                "Allow",
                0,
                vec![("app:com.apple.Calculator", RuleAction::Allow)],
            ),
            profile(
                "Block",
                0,
                vec![("app:com.apple.Calculator", RuleAction::Block)],
            ),
        ];
        assert!(is_app_blocked(&profiles, "com.apple.Calculator"));
    }

    #[test]
    fn test_blocklist_pattern() {
        let profiles = vec![profile(
            "No Social Media",
            0,
            vec![
                ("website:twitter.com", RuleAction::Block),
                ("website:facebook.com", RuleAction::Block),
            ],
        )];
        assert!(is_website_blocked(&profiles, "twitter.com"));
        assert!(is_website_blocked(&profiles, "facebook.com"));
        assert!(!is_website_blocked(&profiles, "github.com"));
    }

    #[test]
    fn test_exception_pattern() {
        let profiles = vec![
            profile(
                "No Social Media",
                0,
                vec![
                    ("website:twitter.com", RuleAction::Block),
                    ("website:facebook.com", RuleAction::Block),
                ],
            ),
            profile(
                "Allow Twitter",
                1,
                vec![("website:twitter.com", RuleAction::Allow)],
            ),
        ];
        assert!(!is_website_blocked(&profiles, "twitter.com"));
        assert!(is_website_blocked(&profiles, "facebook.com"));
        assert!(!is_website_blocked(&profiles, "github.com"));
    }

    #[test]
    fn test_whitelist_pattern() {
        let profiles = vec![
            profile("Block All", 0, vec![("all", RuleAction::Block)]),
            profile(
                "Coding Apps",
                1,
                vec![
                    ("app:com.microsoft.VSCode", RuleAction::Allow),
                    ("app:com.apple.Terminal", RuleAction::Allow),
                ],
            ),
        ];
        assert!(!is_app_blocked(&profiles, "com.microsoft.VSCode"));
        assert!(!is_app_blocked(&profiles, "com.apple.Terminal"));
        assert!(is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(is_website_blocked(&profiles, "youtube.com"));
    }

    #[test]
    fn test_break_pattern() {
        let profiles = vec![
            profile("Block All", 0, vec![("all", RuleAction::Block)]),
            profile(
                "Coding Apps",
                1,
                vec![("app:com.microsoft.VSCode", RuleAction::Allow)],
            ),
            profile("Break", 99, vec![("all", RuleAction::Allow)]),
        ];
        assert!(!is_app_blocked(&profiles, "com.apple.Calculator"));
        assert!(!is_app_blocked(&profiles, "com.microsoft.VSCode"));
        assert!(!is_website_blocked(&profiles, "youtube.com"));
    }
}
