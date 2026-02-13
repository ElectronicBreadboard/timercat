use super::matcher::fuzzy_match;
use super::types::SearchableItem;
use crate::common::url::{extract_domain, is_domain_like};
use mado::{get_app_icon, get_installed_apps, InstalledAppsConfig};
use std::collections::HashSet;

pub struct AppSearch {
    apps: Vec<SearchableItem>,
    websites: Vec<SearchableItem>,
}

impl AppSearch {
    pub fn new() -> Self {
        return Self {
            apps: Self::load_apps(),
            websites: Self::load_websites(),
        };
    }

    /// Refresh the cache (reloads apps from system).
    pub fn refresh(&mut self) {
        self.apps = Self::load_apps();
    }

    /// Search apps and websites by query.
    pub fn search(
        &mut self,
        query: &str,
        include_apps: bool,
        include_websites: bool,
        include_icons: bool,
        limit: usize,
    ) -> Vec<(SearchableItem, u32)> {
        // Create custom domain if query looks like a domain
        let mut custom_domain: Option<SearchableItem> = if include_websites && is_domain_like(query)
        {
            extract_domain(query).map(|d| SearchableItem::custom_domain(&d))
        } else {
            None
        };

        // Build search iterator
        let apps = if include_apps {
            self.apps.iter_mut()
        } else {
            [].iter_mut()
        };
        let websites = if include_websites {
            self.websites.iter_mut()
        } else {
            [].iter_mut()
        };
        let to_search = apps.chain(websites).chain(custom_domain.iter_mut());

        // Search, dedupe by id (highest score wins), populate icons, and take limit
        let matches = fuzzy_match(to_search, query);
        let mut seen: HashSet<String> = HashSet::new();
        return matches
            .into_iter()
            .filter(|(item, _)| seen.insert(item.id().to_string()))
            .take(limit)
            .map(|(item, score)| {
                if include_icons {
                    Self::populate_icon(item);
                }
                (item.clone(), score)
            })
            .collect();
    }

    fn populate_icon(item: &mut SearchableItem) {
        match item {
            SearchableItem::App { app, .. } => {
                if app.icon.is_some() {
                    return;
                }
                let data = get_app_icon(&app.bundle_id, 64);
                app.icon = data.data_url;
                app.color = data.color;
            }
            SearchableItem::Website { website, .. } => {
                if website.icon.is_some() {
                    return;
                }
                website.icon = Some(format!(
                    "https://www.google.com/s2/favicons?domain={}&sz=64",
                    website.domain
                ));
            }
        }
    }

    fn load_apps() -> Vec<SearchableItem> {
        let config = InstalledAppsConfig {
            include_icon: false,
            icon_size: 0,
        };

        return get_installed_apps(config)
            .into_iter()
            .map(|app| SearchableItem::app(app.bundle_id, Some(app.name)))
            .collect();
    }

    fn load_websites() -> Vec<SearchableItem> {
        return POPULAR_WEBSITES
            .iter()
            .map(|entry| {
                SearchableItem::website(
                    entry.domains[0].to_string(),
                    Some(entry.name.to_string()),
                    entry.domains.iter().map(|d| d.to_string()).collect(),
                )
            })
            .collect();
    }
}

// MARK: - Website Data

struct WebsiteEntry {
    name: &'static str,
    domains: &'static [&'static str],
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
    WebsiteEntry {
        name: "Linear",
        domains: &["linear.app"],
    },
    WebsiteEntry {
        name: "ClickUp",
        domains: &["clickup.com", "app.clickup.com"],
    },
    WebsiteEntry {
        name: "Basecamp",
        domains: &["basecamp.com", "3.basecamp.com"],
    },
    WebsiteEntry {
        name: "Jira",
        domains: &["atlassian.net", "jira.com"],
    },
    WebsiteEntry {
        name: "Confluence",
        domains: &["atlassian.net/wiki"],
    },
    WebsiteEntry {
        name: "Todoist",
        domains: &["todoist.com"],
    },
    WebsiteEntry {
        name: "Evernote",
        domains: &["evernote.com"],
    },
    WebsiteEntry {
        name: "Calendly",
        domains: &["calendly.com"],
    },
    WebsiteEntry {
        name: "Loom",
        domains: &["loom.com"],
    },
    WebsiteEntry {
        name: "Grammarly",
        domains: &["grammarly.com", "app.grammarly.com"],
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
    WebsiteEntry {
        name: "Bitbucket",
        domains: &["bitbucket.org"],
    },
    WebsiteEntry {
        name: "Supabase",
        domains: &["supabase.com", "app.supabase.com"],
    },
    WebsiteEntry {
        name: "Railway",
        domains: &["railway.app"],
    },
    WebsiteEntry {
        name: "Render",
        domains: &["render.com", "dashboard.render.com"],
    },
    WebsiteEntry {
        name: "DigitalOcean",
        domains: &["digitalocean.com", "cloud.digitalocean.com"],
    },
    WebsiteEntry {
        name: "Heroku",
        domains: &["heroku.com", "dashboard.heroku.com"],
    },
    WebsiteEntry {
        name: "Replit",
        domains: &["replit.com", "repl.it"],
    },
    WebsiteEntry {
        name: "CodePen",
        domains: &["codepen.io"],
    },
    WebsiteEntry {
        name: "CodeSandbox",
        domains: &["codesandbox.io"],
    },
    WebsiteEntry {
        name: "npm",
        domains: &["npmjs.com"],
    },
    WebsiteEntry {
        name: "crates.io",
        domains: &["crates.io"],
    },
    WebsiteEntry {
        name: "Docs.rs",
        domains: &["docs.rs"],
    },
    // Design
    WebsiteEntry {
        name: "Dribbble",
        domains: &["dribbble.com"],
    },
    WebsiteEntry {
        name: "Behance",
        domains: &["behance.net"],
    },
    WebsiteEntry {
        name: "Adobe Creative Cloud",
        domains: &["adobe.com", "creativecloud.adobe.com"],
    },
    WebsiteEntry {
        name: "Webflow",
        domains: &["webflow.com", "webflow.io"],
    },
    WebsiteEntry {
        name: "Framer",
        domains: &["framer.com", "framer.app"],
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
    WebsiteEntry {
        name: "Vimeo",
        domains: &["vimeo.com"],
    },
    WebsiteEntry {
        name: "Crunchyroll",
        domains: &["crunchyroll.com"],
    },
    // Gaming
    WebsiteEntry {
        name: "Steam",
        domains: &[
            "store.steampowered.com",
            "steampowered.com",
            "steamcommunity.com",
        ],
    },
    WebsiteEntry {
        name: "Epic Games",
        domains: &["epicgames.com", "store.epicgames.com"],
    },
    WebsiteEntry {
        name: "GOG",
        domains: &["gog.com"],
    },
    WebsiteEntry {
        name: "Xbox",
        domains: &["xbox.com"],
    },
    WebsiteEntry {
        name: "PlayStation",
        domains: &["playstation.com", "store.playstation.com"],
    },
    WebsiteEntry {
        name: "Nintendo",
        domains: &["nintendo.com"],
    },
    WebsiteEntry {
        name: "IGN",
        domains: &["ign.com"],
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
    WebsiteEntry {
        name: "AliExpress",
        domains: &["aliexpress.com"],
    },
    WebsiteEntry {
        name: "Walmart",
        domains: &["walmart.com"],
    },
    WebsiteEntry {
        name: "Target",
        domains: &["target.com"],
    },
    WebsiteEntry {
        name: "Best Buy",
        domains: &["bestbuy.com"],
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
    WebsiteEntry {
        name: "Skillshare",
        domains: &["skillshare.com"],
    },
    WebsiteEntry {
        name: "Codecademy",
        domains: &["codecademy.com"],
    },
    WebsiteEntry {
        name: "edX",
        domains: &["edx.org"],
    },
    WebsiteEntry {
        name: "LinkedIn Learning",
        domains: &["linkedin.com/learning"],
    },
    // AI Tools
    WebsiteEntry {
        name: "Midjourney",
        domains: &["midjourney.com"],
    },
    WebsiteEntry {
        name: "Perplexity",
        domains: &["perplexity.ai"],
    },
    WebsiteEntry {
        name: "Gemini",
        domains: &["gemini.google.com"],
    },
    WebsiteEntry {
        name: "Copilot",
        domains: &["copilot.microsoft.com", "github.com/features/copilot"],
    },
    WebsiteEntry {
        name: "Hugging Face",
        domains: &["huggingface.co"],
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
