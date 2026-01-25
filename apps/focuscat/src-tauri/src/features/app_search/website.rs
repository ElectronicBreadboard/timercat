use super::types::{ItemType, SearchableItem};

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

// MARK: - Config

pub struct WebsiteConfig;

impl WebsiteConfig {
    /// Get favicon URL for a domain.
    pub fn favicon_url(domain: &str, size: u32) -> String {
        return format!(
            "https://www.google.com/s2/favicons?domain={}&sz={}",
            domain, size
        );
    }

    /// Get all popular websites as searchable items.
    pub fn websites() -> Vec<SearchableItem> {
        return Self::POPULAR_WEBSITES
            .iter()
            .map(|entry| SearchableItem {
                id: entry.domains[0].to_string(),
                name: entry.name.to_string(),
                item_type: ItemType::Website,
                icon: None,
                color: None,
                keywords: entry.domains.iter().map(|d| d.to_string()).collect(),
            })
            .collect();
    }

    const POPULAR_WEBSITES: &[WebsiteEntry] = &[
        // Social Media
        WebsiteEntry {
            name: "YouTube",
            domains: &["youtube.com", "youtu.be", "youtube-nocookie.com"],
        },
        WebsiteEntry {
            name: "Facebook",
            domains: &["facebook.com", "fb.com", "messenger.com"],
        },
        WebsiteEntry {
            name: "Instagram",
            domains: &["instagram.com"],
        },
        WebsiteEntry {
            name: "Twitter / X",
            domains: &["twitter.com", "x.com", "t.co"],
        },
        WebsiteEntry {
            name: "TikTok",
            domains: &["tiktok.com"],
        },
        WebsiteEntry {
            name: "Reddit",
            domains: &["reddit.com", "redd.it"],
        },
        WebsiteEntry {
            name: "LinkedIn",
            domains: &["linkedin.com"],
        },
        WebsiteEntry {
            name: "Pinterest",
            domains: &["pinterest.com", "pin.it"],
        },
        WebsiteEntry {
            name: "Snapchat",
            domains: &["snapchat.com"],
        },
        WebsiteEntry {
            name: "Discord",
            domains: &["discord.com", "discord.gg"],
        },
        WebsiteEntry {
            name: "Twitch",
            domains: &["twitch.tv"],
        },
        // Productivity
        WebsiteEntry {
            name: "Google",
            domains: &["google.com", "google.co.uk", "google.de", "google.fr"],
        },
        WebsiteEntry {
            name: "Gmail",
            domains: &["mail.google.com", "gmail.com"],
        },
        WebsiteEntry {
            name: "Google Drive",
            domains: &["drive.google.com"],
        },
        WebsiteEntry {
            name: "Google Docs",
            domains: &["docs.google.com"],
        },
        WebsiteEntry {
            name: "Google Calendar",
            domains: &["calendar.google.com"],
        },
        WebsiteEntry {
            name: "Notion",
            domains: &["notion.so", "notion.com"],
        },
        WebsiteEntry {
            name: "Slack",
            domains: &["slack.com", "app.slack.com"],
        },
        WebsiteEntry {
            name: "Trello",
            domains: &["trello.com"],
        },
        WebsiteEntry {
            name: "Asana",
            domains: &["asana.com", "app.asana.com"],
        },
        WebsiteEntry {
            name: "Monday.com",
            domains: &["monday.com"],
        },
        WebsiteEntry {
            name: "Airtable",
            domains: &["airtable.com"],
        },
        WebsiteEntry {
            name: "Figma",
            domains: &["figma.com"],
        },
        WebsiteEntry {
            name: "Canva",
            domains: &["canva.com"],
        },
        WebsiteEntry {
            name: "Miro",
            domains: &["miro.com"],
        },
        // Development
        WebsiteEntry {
            name: "GitHub",
            domains: &["github.com", "gist.github.com"],
        },
        WebsiteEntry {
            name: "GitLab",
            domains: &["gitlab.com"],
        },
        WebsiteEntry {
            name: "Stack Overflow",
            domains: &["stackoverflow.com", "stackexchange.com"],
        },
        WebsiteEntry {
            name: "ChatGPT",
            domains: &["chat.openai.com", "chatgpt.com", "openai.com"],
        },
        WebsiteEntry {
            name: "Claude",
            domains: &["claude.ai", "anthropic.com"],
        },
        WebsiteEntry {
            name: "Vercel",
            domains: &["vercel.com", "vercel.app"],
        },
        WebsiteEntry {
            name: "Netlify",
            domains: &["netlify.com", "netlify.app"],
        },
        WebsiteEntry {
            name: "AWS",
            domains: &["aws.amazon.com", "console.aws.amazon.com"],
        },
        // Entertainment
        WebsiteEntry {
            name: "Netflix",
            domains: &["netflix.com"],
        },
        WebsiteEntry {
            name: "Spotify",
            domains: &["spotify.com", "open.spotify.com"],
        },
        WebsiteEntry {
            name: "Amazon Prime Video",
            domains: &["primevideo.com", "amazon.com/primevideo"],
        },
        WebsiteEntry {
            name: "Disney+",
            domains: &["disneyplus.com"],
        },
        WebsiteEntry {
            name: "Hulu",
            domains: &["hulu.com"],
        },
        WebsiteEntry {
            name: "HBO Max",
            domains: &["max.com", "hbomax.com"],
        },
        WebsiteEntry {
            name: "Apple TV+",
            domains: &["tv.apple.com"],
        },
        // Shopping
        WebsiteEntry {
            name: "Amazon",
            domains: &["amazon.com", "amazon.co.uk", "amazon.de", "amzn.to"],
        },
        WebsiteEntry {
            name: "eBay",
            domains: &["ebay.com", "ebay.co.uk"],
        },
        WebsiteEntry {
            name: "Etsy",
            domains: &["etsy.com"],
        },
        WebsiteEntry {
            name: "Shopify",
            domains: &["shopify.com", "myshopify.com"],
        },
        // News & Reading
        WebsiteEntry {
            name: "Medium",
            domains: &["medium.com"],
        },
        WebsiteEntry {
            name: "Substack",
            domains: &["substack.com"],
        },
        WebsiteEntry {
            name: "New York Times",
            domains: &["nytimes.com"],
        },
        WebsiteEntry {
            name: "BBC",
            domains: &["bbc.com", "bbc.co.uk"],
        },
        WebsiteEntry {
            name: "CNN",
            domains: &["cnn.com"],
        },
        WebsiteEntry {
            name: "The Guardian",
            domains: &["theguardian.com"],
        },
        WebsiteEntry {
            name: "Hacker News",
            domains: &["news.ycombinator.com"],
        },
        // Communication
        WebsiteEntry {
            name: "WhatsApp",
            domains: &["web.whatsapp.com", "whatsapp.com"],
        },
        WebsiteEntry {
            name: "Telegram",
            domains: &["telegram.org", "web.telegram.org"],
        },
        WebsiteEntry {
            name: "Zoom",
            domains: &["zoom.us"],
        },
        WebsiteEntry {
            name: "Microsoft Teams",
            domains: &["teams.microsoft.com"],
        },
        WebsiteEntry {
            name: "Google Meet",
            domains: &["meet.google.com"],
        },
        // Finance
        WebsiteEntry {
            name: "PayPal",
            domains: &["paypal.com"],
        },
        WebsiteEntry {
            name: "Stripe",
            domains: &["stripe.com", "dashboard.stripe.com"],
        },
        // Learning
        WebsiteEntry {
            name: "Coursera",
            domains: &["coursera.org"],
        },
        WebsiteEntry {
            name: "Udemy",
            domains: &["udemy.com"],
        },
        WebsiteEntry {
            name: "Khan Academy",
            domains: &["khanacademy.org"],
        },
        WebsiteEntry {
            name: "Duolingo",
            domains: &["duolingo.com"],
        },
        // Other
        WebsiteEntry {
            name: "Wikipedia",
            domains: &["wikipedia.org", "en.wikipedia.org"],
        },
        WebsiteEntry {
            name: "Dropbox",
            domains: &["dropbox.com"],
        },
        WebsiteEntry {
            name: "iCloud",
            domains: &["icloud.com"],
        },
        WebsiteEntry {
            name: "OneDrive",
            domains: &["onedrive.live.com"],
        },
        WebsiteEntry {
            name: "Outlook",
            domains: &["outlook.com", "outlook.live.com"],
        },
    ];
}

struct WebsiteEntry {
    name: &'static str,
    domains: &'static [&'static str],
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
