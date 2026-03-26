use super::repository::UpsertAppInput;

/// Reuse the normal bundle-id upsert path by synthesizing a stable bundle-like id
/// for unbundled apps, so dev builds do not create a new app row on every activation.
pub fn to_stable_bundle_id(input: &UpsertAppInput) -> Option<String> {
    if let Some(bundle_id) = input
        .bundle_id
        .as_deref()
        .map(str::trim)
        .filter(|bundle_id| !bundle_id.is_empty())
    {
        return Some(bundle_id.to_string());
    }

    let process_path = input
        .process_path
        .as_deref()
        .map(str::trim)
        .filter(|process_path| !process_path.is_empty())?;
    let name = slugify_bundle_part(input.name.as_deref().unwrap_or("app"));
    let hash = hash_fnv1a64(process_path.as_bytes());

    return Some(format!("local.unbundled.{name}.{hash:016x}"));
}

fn slugify_bundle_part(input: &str) -> String {
    let mut slug = String::with_capacity(input.len());
    let mut last_was_separator = false;

    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch.to_ascii_lowercase());
            last_was_separator = false;
        } else if !last_was_separator {
            slug.push('-');
            last_was_separator = true;
        }
    }

    while slug.ends_with('-') {
        slug.pop();
    }

    if slug.is_empty() {
        return "app".to_string();
    }

    return slug;
}

fn hash_fnv1a64(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;

    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }

    return hash;
}
