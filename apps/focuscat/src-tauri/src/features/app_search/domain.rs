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

/// Extract domain from URL-like input.
pub fn extract_domain(input: &str) -> String {
    let input = input.trim();

    // Remove protocol
    let without_protocol = input
        .strip_prefix("https://")
        .or_else(|| input.strip_prefix("http://"))
        .unwrap_or(input);

    // Take host part only
    let host = without_protocol
        .split('/')
        .next()
        .unwrap_or(without_protocol);

    // Remove port
    let without_port = host.split(':').next().unwrap_or(host);

    // Remove www
    let domain = without_port.strip_prefix("www.").unwrap_or(without_port);

    return domain.to_lowercase();
}

// MARK: - Tests

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn test_extract_domain() {
        assert_eq!(extract_domain("google.com"), "google.com");
        assert_eq!(extract_domain("https://google.com"), "google.com");
        assert_eq!(extract_domain("http://google.com/path"), "google.com");
        assert_eq!(extract_domain("www.google.com"), "google.com");
        assert_eq!(
            extract_domain("https://www.google.com/search"),
            "google.com"
        );
        assert_eq!(extract_domain("localhost:3000"), "localhost");
        assert_eq!(extract_domain("GOOGLE.COM"), "google.com");
    }
}
