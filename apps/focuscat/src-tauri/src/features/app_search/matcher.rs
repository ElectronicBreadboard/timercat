use super::types::SearchableItem;
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};
use std::borrow::Borrow;

/// Fuzzy match items against a query.
/// Returns items with their match scores, sorted by score (descending).
pub fn fuzzy_match<R>(items: impl IntoIterator<Item = R>, query: &str) -> Vec<(R, u32)>
where
    R: Borrow<SearchableItem>,
{
    let mut matcher = Matcher::new(Config::DEFAULT);
    let pattern = Pattern::parse(query, CaseMatching::Ignore, Normalization::Smart);
    let query_lower = query.to_lowercase();

    let mut results: Vec<(R, u32)> = Vec::new();

    for item in items {
        let best_score = get_best_score(&mut matcher, &pattern, &query_lower, item.borrow());
        if best_score > 0 {
            results.push((item, best_score));
        }
    }

    results.sort_by(|a, b| b.1.cmp(&a.1));
    return results;
}

/// Get the best match score for an item (checks name and keywords).
fn get_best_score(
    matcher: &mut Matcher,
    pattern: &Pattern,
    query_lower: &str,
    item: &SearchableItem,
) -> u32 {
    let mut best_score: u32 = 0;
    let name_lower = item.name.to_lowercase();

    // Match against name (1.5x boost, +1.3x for prefix)
    if let Some(score) = match_str(matcher, pattern, &item.name) {
        let mut name_score = (score as f32 * 1.5) as u32;

        // Prefix boost: "disc" -> "Discord" ranks higher than "Podcast"
        if name_lower.starts_with(query_lower) {
            name_score = (name_score as f32 * 1.3) as u32;
        }

        best_score = best_score.max(name_score);
    }

    // Match against keywords (e.g., domains, bundle IDs)
    for keyword in &item.keywords {
        if let Some(score) = match_str(matcher, pattern, keyword) {
            best_score = best_score.max(score);
        }
    }

    return best_score;
}

/// Match a string against the pattern.
fn match_str(matcher: &mut Matcher, pattern: &Pattern, haystack: &str) -> Option<u32> {
    let mut buf = Vec::new();
    let haystack_utf32 = Utf32Str::new(haystack, &mut buf);

    return pattern.score(haystack_utf32, matcher);
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::app_search::types::ItemType;

    fn make_item(name: &str, keywords: Vec<&str>) -> SearchableItem {
        SearchableItem {
            id: name.to_lowercase(),
            name: name.to_string(),
            item_type: ItemType::App,
            keywords: keywords.into_iter().map(String::from).collect(),
            icon: None,
            color: None,
        }
    }

    #[test]
    fn test_exact_match() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Safari", vec!["com.apple.Safari"]),
        ];

        let results = fuzzy_match(items.iter(), "chrome");
        assert!(!results.is_empty());
        assert_eq!(results[0].0.name, "Chrome");
    }

    #[test]
    fn test_partial_match() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Safari", vec!["com.apple.Safari"]),
        ];

        // Partial match: "chr" should match "Chrome"
        let results = fuzzy_match(items.iter(), "chr");
        assert!(!results.is_empty());
        assert_eq!(results[0].0.name, "Chrome");
    }

    #[test]
    fn test_subsequence_match() {
        let items = vec![
            make_item("Visual Studio Code", vec!["com.microsoft.VSCode"]),
            make_item("Xcode", vec!["com.apple.dt.Xcode"]),
        ];

        // Subsequence: "vsc" matches "Visual Studio Code"
        let results = fuzzy_match(items.iter(), "vsc");
        assert!(!results.is_empty());
        assert_eq!(results[0].0.name, "Visual Studio Code");
    }

    #[test]
    fn test_keyword_match() {
        let items = vec![make_item("Safari", vec!["com.apple.Safari"])];

        // Match by bundle ID keyword
        let results = fuzzy_match(items.iter(), "apple.safari");
        assert!(!results.is_empty());
        assert_eq!(results[0].0.name, "Safari");
    }

    #[test]
    fn test_no_match() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Safari", vec!["com.apple.Safari"]),
        ];

        let results = fuzzy_match(items.iter(), "zzzzz");
        assert!(results.is_empty());
    }

    #[test]
    fn test_ranking() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Chrome Canary", vec!["com.google.Chrome.canary"]),
            make_item("Chromium", vec!["org.chromium.Chromium"]),
        ];

        let results = fuzzy_match(items.iter(), "chrome");
        assert!(results.len() >= 2);
        // Exact match should rank higher
        assert_eq!(results[0].0.name, "Chrome");
    }

    #[test]
    fn test_works_with_mutable_refs() {
        let mut items = vec![make_item("Chrome", vec!["com.google.Chrome"])];

        // Verify fuzzy_match works with mutable refs too
        let mut results = fuzzy_match(items.iter_mut(), "chrome");
        assert!(!results.is_empty());

        // Can mutate through the returned ref
        results[0].0.icon = Some("test".to_string());
        assert_eq!(items[0].icon, Some("test".to_string()));
    }
}
