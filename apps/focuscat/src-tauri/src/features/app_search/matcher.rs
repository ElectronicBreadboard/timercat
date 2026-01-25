use super::types::SearchableItem;
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};

/// Fuzzy match items against a query.
/// Returns items with their match scores, sorted by score (descending).
pub fn fuzzy_match<'a>(items: &'a [SearchableItem], query: &str) -> Vec<(&'a SearchableItem, u32)> {
    let mut matcher = Matcher::new(Config::DEFAULT);
    let pattern = Pattern::parse(query, CaseMatching::Ignore, Normalization::Smart);

    let mut results: Vec<(&SearchableItem, u32)> = Vec::new();

    for item in items {
        let best_score = get_best_score(&mut matcher, &pattern, item);
        if best_score > 0 {
            results.push((item, best_score));
        }
    }

    // Sort by score descending
    results.sort_by(|a, b| b.1.cmp(&a.1));

    return results;
}

/// Get the best match score for an item (checks name and keywords).
fn get_best_score(matcher: &mut Matcher, pattern: &Pattern, item: &SearchableItem) -> u32 {
    let mut best_score: u32 = 0;

    // Match against name
    if let Some(score) = match_str(matcher, pattern, &item.name) {
        // Boost name matches
        best_score = best_score.max(score + 100);
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
            icon: None,
            color: None,
            keywords: keywords.into_iter().map(String::from).collect(),
        }
    }

    #[test]
    fn test_exact_match() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Safari", vec!["com.apple.Safari"]),
        ];

        let results = fuzzy_match(&items, "chrome");
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
        let results = fuzzy_match(&items, "chr");
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
        let results = fuzzy_match(&items, "vsc");
        assert!(!results.is_empty());
        assert_eq!(results[0].0.name, "Visual Studio Code");
    }

    #[test]
    fn test_keyword_match() {
        let items = vec![make_item("Safari", vec!["com.apple.Safari"])];

        // Match by bundle ID keyword
        let results = fuzzy_match(&items, "apple.safari");
        assert!(!results.is_empty());
        assert_eq!(results[0].0.name, "Safari");
    }

    #[test]
    fn test_no_match() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Safari", vec!["com.apple.Safari"]),
        ];

        let results = fuzzy_match(&items, "zzzzz");
        assert!(results.is_empty());
    }

    #[test]
    fn test_ranking() {
        let items = vec![
            make_item("Chrome", vec!["com.google.Chrome"]),
            make_item("Chrome Canary", vec!["com.google.Chrome.canary"]),
            make_item("Chromium", vec!["org.chromium.Chromium"]),
        ];

        let results = fuzzy_match(&items, "chrome");
        assert!(results.len() >= 2);
        // Exact match should rank higher
        assert_eq!(results[0].0.name, "Chrome");
    }
}
