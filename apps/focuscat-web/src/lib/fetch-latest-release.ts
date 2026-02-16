let CACHE: { data: TReleaseInfo; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchLatestRelease(repo: string): Promise<TReleaseInfo> {
	if (CACHE != null && Date.now() - CACHE.timestamp < CACHE_TTL_MS) {
		return CACHE.data;
	}

	// /releases/latest only returns non-prerelease, non-draft releases.
	// Pre-releases (from e.g. develop CI) won't appear here until promoted to a full release.
	const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
		headers: { Accept: 'application/vnd.github.v3+json' }
	});
	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	const release = (await response.json()) as TGitHubRelease;
	const data: TReleaseInfo = {
		version: release.tag_name,
		downloadLinks: matchAssetUrl(release.assets ?? [])
	};

	CACHE = { data, timestamp: Date.now() };
	return data;
}

export interface TReleaseInfo {
	version: string;
	downloadLinks: TDownloadLinks;
}

interface TGitHubRelease {
	tag_name: string;
	assets: { name: string; browser_download_url: string }[];
}

function matchAssetUrl(assets: TGitHubRelease['assets']): Partial<TDownloadLinks> {
	const links: Partial<TDownloadLinks> = {};

	for (const { name: rawName, browser_download_url: url } of assets) {
		const name = rawName.toLowerCase();

		// Skip updater artifacts and signatures
		if (
			name.endsWith('.sig') ||
			name.endsWith('.txt') ||
			name.endsWith('.json') ||
			name.endsWith('.app.tar.gz')
		) {
			continue;
		}

		const isArm = name.includes('aarch64') || name.includes('arm64');
		const isX86 = name.includes('x64') || name.includes('x86_64');

		if (name.endsWith('.dmg') && isArm) {
			links.macArm = url;
		} else if (name.endsWith('.dmg') && isX86) {
			links.macIntel = url;
		} else if (name.endsWith('.msi')) {
			links.windows = url;
		}
	}

	return links;
}

export interface TDownloadLinks {
	macArm?: string;
	macIntel?: string;
	windows?: string;
}
