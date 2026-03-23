use super::repository::{
    FocusProfileCategoryRow, FocusProfileScheduleRow, FocusProfileWithRelations,
};
use super::types::{FocusCategory, ScheduleMode};
use crate::features::settings::types::BlockThreshold;

/// Resolve the focus category for an app across active profiles.
/// Returns (category, winning_profile). Default category is Neutral.
pub fn resolve_category_for_app<'a>(
    bundle_id: &str,
    profiles: &'a [ResolutionProfile],
) -> (FocusCategory, Option<&'a ResolutionProfile>) {
    resolve_category(
        &TargetKey::App {
            bundle_id: bundle_id.to_string(),
        },
        profiles,
    )
}

/// Resolve the focus category for a website across active profiles.
/// Returns (category, winning_profile). Default category is Neutral.
pub fn resolve_category_for_website<'a>(
    domain: &str,
    profiles: &'a [ResolutionProfile],
) -> (FocusCategory, Option<&'a ResolutionProfile>) {
    resolve_category(
        &TargetKey::Website {
            domain: domain.to_string(),
        },
        profiles,
    )
}

/// True if the category meets or exceeds the blocking threshold.
pub fn is_blocked(category: &FocusCategory, threshold: &BlockThreshold) -> bool {
    match threshold {
        BlockThreshold::Distracting => matches!(category, FocusCategory::Distracting),
        BlockThreshold::Neutral => matches!(
            category,
            FocusCategory::Neutral | FocusCategory::Distracting
        ),
    }
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
        schedule_time_matches(&s.start_time, &s.end_time, current_time)
    })
}

/// Convert repository profiles into resolution profiles, sorted by priority descending.
pub fn to_resolution_profiles(
    profiles: &[(&FocusProfileWithRelations, i64)],
) -> Vec<ResolutionProfile> {
    let mut result: Vec<ResolutionProfile> = profiles
        .iter()
        .map(|(profile, priority)| ResolutionProfile {
            priority: *priority,
            profile_id: profile.profile.id,
            profile_name: profile.profile.name.clone(),
            profile_color: profile.profile.color.clone(),
            categories: profile
                .categories
                .iter()
                .map(|c| ResolutionCategory {
                    target_key: TargetKey::from_category_row(c),
                    category: FocusCategory::from_str(&c.category)
                        .unwrap_or(FocusCategory::Neutral),
                })
                .collect(),
        })
        .collect();

    result.sort_by(|a, b| b.priority.cmp(&a.priority));
    result
}

/// Resolve the category for a target.
///
/// Iterates profiles highest-priority first.
/// Within a profile, a specific assignment (app/website) beats an All assignment.
/// Returns (Neutral, None) if no profile has any matching assignment.
fn resolve_category<'a>(
    key: &TargetKey,
    profiles: &'a [ResolutionProfile],
) -> (FocusCategory, Option<&'a ResolutionProfile>) {
    for profile in profiles {
        // Specific match takes precedence within a profile
        if let Some(cat) = profile
            .categories
            .iter()
            .find(|c| c.target_key.matches_specific(key))
            .map(|c| c.category.clone())
        {
            return (cat, Some(profile));
        }
        // Fall back to All assignment in this profile
        if let Some(cat) = profile
            .categories
            .iter()
            .find(|c| matches!(c.target_key, TargetKey::All))
            .map(|c| c.category.clone())
        {
            return (cat, Some(profile));
        }
    }
    (FocusCategory::Neutral, None)
}

/// True if current_time falls within [start, end). Handles overnight ranges.
pub(super) fn schedule_time_matches(start: &str, end: &str, current: &str) -> bool {
    if start <= end {
        start <= current && current < end
    } else {
        current >= start || current < end
    }
}

// MARK: - Types

#[derive(Clone)]
pub struct ResolutionProfile {
    pub priority: i64,
    pub profile_id: i64,
    pub profile_name: String,
    pub profile_color: Option<String>,
    pub categories: Vec<ResolutionCategory>,
}

#[derive(Clone)]
pub struct ResolutionCategory {
    pub target_key: TargetKey,
    pub category: FocusCategory,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum TargetKey {
    All,
    App { bundle_id: String },
    Website { domain: String },
}

impl TargetKey {
    fn from_category_row(row: &FocusProfileCategoryRow) -> Self {
        if let Some(ref bundle_id) = row.app_bundle_id {
            return TargetKey::App {
                bundle_id: bundle_id.clone(),
            };
        }
        if let Some(ref domain) = row.website_domain {
            return TargetKey::Website {
                domain: domain.clone(),
            };
        }
        TargetKey::All
    }

    /// True if self matches other as a specific target (app or website). Never matches All.
    fn matches_specific(&self, other: &TargetKey) -> bool {
        match (self, other) {
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

    fn profile(priority: i32, categories: Vec<(&str, FocusCategory)>) -> ResolutionProfile {
        ResolutionProfile {
            priority: priority as i64,
            profile_id: 0,
            profile_name: String::new(),
            profile_color: None,
            categories: categories
                .into_iter()
                .map(|(key, category)| ResolutionCategory {
                    target_key: parse_key(key),
                    category,
                })
                .collect(),
        }
    }

    /// Build profiles sorted by priority descending, as to_resolution_profiles guarantees.
    fn profiles(mut ps: Vec<ResolutionProfile>) -> Vec<ResolutionProfile> {
        ps.sort_by(|a, b| b.priority.cmp(&a.priority));
        ps
    }

    fn parse_key(key: &str) -> TargetKey {
        if key == "all" {
            return TargetKey::All;
        }
        if let Some(bid) = key.strip_prefix("app:") {
            return TargetKey::App {
                bundle_id: bid.to_string(),
            };
        }
        if let Some(dom) = key.strip_prefix("website:") {
            return TargetKey::Website {
                domain: dom.to_string(),
            };
        }
        TargetKey::All
    }

    fn app_category(ps: &[ResolutionProfile], bundle_id: &str) -> FocusCategory {
        resolve_category_for_app(bundle_id, ps).0
    }

    fn website_category(ps: &[ResolutionProfile], domain: &str) -> FocusCategory {
        resolve_category_for_website(domain, ps).0
    }

    #[test]
    fn test_no_profiles_returns_neutral() {
        let ps = profiles(vec![]);
        assert!(matches!(
            app_category(&ps, "com.apple.Calculator"),
            FocusCategory::Neutral
        ));
    }

    #[test]
    fn test_no_matching_assignment_returns_neutral() {
        let ps = profiles(vec![profile(
            0,
            vec![("app:com.apple.Calculator", FocusCategory::Focused)],
        )]);
        assert!(matches!(
            app_category(&ps, "com.microsoft.VSCode"),
            FocusCategory::Neutral
        ));
    }

    #[test]
    fn test_specific_app_assignment() {
        let ps = profiles(vec![profile(
            0,
            vec![
                ("app:com.apple.Xcode", FocusCategory::Focused),
                ("app:com.discord.Discord", FocusCategory::Distracting),
            ],
        )]);
        assert!(matches!(
            app_category(&ps, "com.apple.Xcode"),
            FocusCategory::Focused
        ));
        assert!(matches!(
            app_category(&ps, "com.discord.Discord"),
            FocusCategory::Distracting
        ));
    }

    #[test]
    fn test_all_assignment_applies_to_everything() {
        let ps = profiles(vec![profile(0, vec![("all", FocusCategory::Distracting)])]);
        assert!(matches!(
            app_category(&ps, "com.apple.Calculator"),
            FocusCategory::Distracting
        ));
        assert!(matches!(
            website_category(&ps, "youtube.com"),
            FocusCategory::Distracting
        ));
    }

    #[test]
    fn test_specific_beats_all_within_same_profile() {
        let ps = profiles(vec![profile(
            0,
            vec![
                ("all", FocusCategory::Distracting),
                ("app:com.apple.Xcode", FocusCategory::Focused),
            ],
        )]);
        assert!(matches!(
            app_category(&ps, "com.apple.Xcode"),
            FocusCategory::Focused
        ));
        assert!(matches!(
            app_category(&ps, "com.discord.Discord"),
            FocusCategory::Distracting
        ));
    }

    #[test]
    fn test_higher_priority_wins() {
        // p1 all→Distracting beats p0 specific Xcode→Focused
        let ps = profiles(vec![
            profile(0, vec![("app:com.apple.Xcode", FocusCategory::Focused)]),
            profile(1, vec![("all", FocusCategory::Distracting)]),
        ]);
        assert!(matches!(
            app_category(&ps, "com.apple.Xcode"),
            FocusCategory::Distracting
        ));
    }

    #[test]
    fn test_whitelist_pattern() {
        // p0: all→Distracting, p1: specific apps→Focused
        let ps = profiles(vec![
            profile(0, vec![("all", FocusCategory::Distracting)]),
            profile(
                1,
                vec![
                    ("app:com.apple.Xcode", FocusCategory::Focused),
                    ("app:com.apple.Terminal", FocusCategory::Focused),
                ],
            ),
        ]);
        assert!(matches!(
            app_category(&ps, "com.apple.Xcode"),
            FocusCategory::Focused
        ));
        assert!(matches!(
            app_category(&ps, "com.apple.Terminal"),
            FocusCategory::Focused
        ));
        assert!(matches!(
            app_category(&ps, "com.discord.Discord"),
            FocusCategory::Distracting
        ));
        assert!(matches!(
            website_category(&ps, "youtube.com"),
            FocusCategory::Distracting
        ));
    }

    #[test]
    fn test_exception_pattern() {
        // p1 overrides p0's category for twitter
        let ps = profiles(vec![
            profile(0, vec![("website:twitter.com", FocusCategory::Distracting)]),
            profile(1, vec![("website:twitter.com", FocusCategory::Neutral)]),
        ]);
        assert!(matches!(
            website_category(&ps, "twitter.com"),
            FocusCategory::Neutral
        ));
        assert!(matches!(
            website_category(&ps, "facebook.com"),
            FocusCategory::Neutral
        ));
    }

    #[test]
    fn test_is_blocked_distracting_threshold() {
        assert!(is_blocked(
            &FocusCategory::Distracting,
            &BlockThreshold::Distracting
        ));
        assert!(!is_blocked(
            &FocusCategory::Neutral,
            &BlockThreshold::Distracting
        ));
        assert!(!is_blocked(
            &FocusCategory::Focused,
            &BlockThreshold::Distracting
        ));
    }

    #[test]
    fn test_is_blocked_neutral_threshold() {
        assert!(is_blocked(
            &FocusCategory::Distracting,
            &BlockThreshold::Neutral
        ));
        assert!(is_blocked(
            &FocusCategory::Neutral,
            &BlockThreshold::Neutral
        ));
        assert!(!is_blocked(
            &FocusCategory::Focused,
            &BlockThreshold::Neutral
        ));
    }
}
