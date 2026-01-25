/// Extract domain from URL.
pub fn extract_domain(url: &str) -> Option<String> {
    let url = url.trim();
    if url.is_empty() {
        return None;
    }

    let without_protocol = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);

    let host = without_protocol.split('/').next()?;
    let without_port = host.split(':').next()?;
    let domain = without_port.strip_prefix("www.").unwrap_or(without_port);

    if domain.is_empty() {
        return None;
    }
    Some(domain.to_lowercase())
}

/// Check if input looks like a domain.
pub fn is_domain_like(input: &str) -> bool {
    let input = input.trim();

    if input.starts_with("http://") || input.starts_with("https://") {
        return true;
    }
    if input.starts_with("localhost") {
        return true;
    }
    if input.contains('.') && !input.contains(' ') {
        return true;
    }

    return false;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_domain() {
        assert_eq!(extract_domain("google.com"), Some("google.com".to_string()));
        assert_eq!(
            extract_domain("https://google.com"),
            Some("google.com".to_string())
        );
        assert_eq!(
            extract_domain("http://google.com/path"),
            Some("google.com".to_string())
        );
        assert_eq!(
            extract_domain("www.google.com"),
            Some("google.com".to_string())
        );
        assert_eq!(
            extract_domain("https://www.google.com/search"),
            Some("google.com".to_string())
        );
        assert_eq!(
            extract_domain("localhost:3000"),
            Some("localhost".to_string())
        );
        assert_eq!(extract_domain("GOOGLE.COM"), Some("google.com".to_string()));
        assert_eq!(extract_domain(""), None);
        assert_eq!(extract_domain("   "), None);
    }

    #[test]
    fn test_is_domain_like() {
        assert!(is_domain_like("google.com"));
        assert!(is_domain_like("https://google.com"));
        assert!(is_domain_like("http://google.com/path"));
        assert!(is_domain_like("localhost"));
        assert!(is_domain_like("localhost:3000"));

        assert!(!is_domain_like("google"));
        assert!(!is_domain_like("hello world.com"));
    }
}
