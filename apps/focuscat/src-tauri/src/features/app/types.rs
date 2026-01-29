use super::search::AppSearch;
use serde::{Deserialize, Serialize};
use std::{ops::Deref, sync::Mutex};

/// An installed application.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct App {
    /// Unique identifier (same as bundle_id).
    pub id: String,
    pub bundle_id: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

impl App {
    pub fn new(bundle_id: String, name: Option<String>) -> Self {
        Self {
            id: bundle_id.clone(),
            bundle_id,
            name,
            icon: None,
            color: None,
        }
    }
}

/// A website identified by domain.
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Website {
    /// Unique identifier (same as domain).
    pub id: String,
    pub domain: String,
    pub name: Option<String>,
    pub icon: Option<String>,
    pub color: Option<String>,
}

impl Website {
    pub fn new(domain: String, name: Option<String>) -> Self {
        Self {
            id: domain.clone(),
            domain,
            name,
            icon: None,
            color: None,
        }
    }
}

/// Internal type for fuzzy search matching.
#[derive(Debug, Clone)]
pub enum SearchableItem {
    App {
        app: App,
        keywords: Vec<String>,
    },
    Website {
        website: Website,
        keywords: Vec<String>,
    },
}

impl SearchableItem {
    /// Create an app search item.
    pub fn app(bundle_id: String, name: Option<String>) -> Self {
        let keywords = vec![bundle_id.clone()];
        Self::App {
            app: App::new(bundle_id, name),
            keywords,
        }
    }

    /// Create a website search item.
    pub fn website(domain: String, name: Option<String>, keywords: Vec<String>) -> Self {
        Self::Website {
            website: Website::new(domain, name),
            keywords,
        }
    }

    /// Create a custom domain item from user input.
    pub fn custom_domain(domain: &str) -> Self {
        Self::Website {
            website: Website::new(domain.to_string(), Some(domain.to_string())),
            keywords: vec![domain.to_string()],
        }
    }

    /// Get the display name for matching.
    pub fn name(&self) -> &str {
        match self {
            Self::App { app, .. } => app.name.as_deref().unwrap_or(&app.bundle_id),
            Self::Website { website, .. } => website.name.as_deref().unwrap_or(&website.domain),
        }
    }

    /// Get the unique identifier.
    pub fn id(&self) -> &str {
        match self {
            Self::App { app, .. } => &app.bundle_id,
            Self::Website { website, .. } => &website.domain,
        }
    }

    /// Get keywords for matching.
    pub fn keywords(&self) -> &[String] {
        match self {
            Self::App { keywords, .. } => keywords,
            Self::Website { keywords, .. } => keywords,
        }
    }

    /// Set the icon.
    pub fn set_icon(&mut self, icon: Option<String>) {
        match self {
            Self::App { app, .. } => app.icon = icon,
            Self::Website { website, .. } => website.icon = icon,
        }
    }

    /// Set the color.
    pub fn set_color(&mut self, color: Option<String>) {
        match self {
            Self::App { app, .. } => app.color = color,
            Self::Website { website, .. } => website.color = color,
        }
    }
}

// MARK: - DTO

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SearchResultDto {
    #[serde(rename = "app")]
    App {
        #[serde(flatten)]
        app: App,
        score: u32,
    },
    #[serde(rename = "website")]
    Website {
        #[serde(flatten)]
        website: Website,
        score: u32,
    },
}

impl SearchResultDto {
    pub fn from_item(item: SearchableItem, score: u32) -> Self {
        match item {
            SearchableItem::App { app, .. } => Self::App { app, score },
            SearchableItem::Website { website, .. } => Self::Website { website, score },
        }
    }
}

// MARK: - State

pub struct AppSearchState(Mutex<AppSearch>);

impl AppSearchState {
    pub fn init() -> Self {
        return Self(Mutex::new(AppSearch::new()));
    }
}

impl Deref for AppSearchState {
    type Target = Mutex<AppSearch>;

    fn deref(&self) -> &Self::Target {
        return &self.0;
    }
}
