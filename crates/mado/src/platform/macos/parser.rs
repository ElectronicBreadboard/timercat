use crate::types::{AppInfo, WindowEvent, WindowInfo};
use serde::de::Error;
use serde_json::Value;

/// Parse WindowEvent from Swift's JSON format
///
/// Swift sends: `{ "type": "AppActivated"|"WindowChanged", "data": {...} }`
pub fn parse_event_from_json(json: &str) -> Result<WindowEvent, serde_json::Error> {
    let value: Value = serde_json::from_str(json)?;

    let event_type = value
        .get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| serde_json::Error::custom("Missing 'type' field"))?;

    let data = value
        .get("data")
        .ok_or_else(|| serde_json::Error::custom("Missing 'data' field"))?;

    match event_type {
        "AppActivated" => {
            let app_data = data
                .get("app")
                .ok_or_else(|| serde_json::Error::custom("Missing 'app' field"))?;
            let app: AppInfo = serde_json::from_value(app_data.clone())?;
            return Ok(WindowEvent::AppActivated { app });
        }
        "WindowChanged" => {
            let window: WindowInfo = serde_json::from_value(data.clone())?;
            return Ok(WindowEvent::WindowChanged { window });
        }
        _ => {
            return Err(serde_json::Error::custom(format!(
                "Unknown event type: {}",
                event_type
            )));
        }
    }
}
