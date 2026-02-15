import React from 'react';

export function useDetectPlatform(): TPlatformInfo {
	const [info, setInfo] = React.useState<TPlatformInfo>({ platform: null, isIntel: false });

	React.useEffect(() => {
		setInfo(detectPlatform());
	}, []);

	return info;
}

export interface TPlatformInfo {
	platform: 'macos' | 'windows' | 'linux' | null;
	isIntel: boolean;
}

function detectPlatform(): TPlatformInfo {
	if (typeof navigator === 'undefined') {
		return { platform: null, isIntel: false };
	}

	const platform = detectOS();
	return {
		platform,
		isIntel: platform === 'macos' && detectIsIntelMac()
	};
}

function detectOS(): TPlatformInfo['platform'] {
	const ua = navigator.userAgent;
	if (ua.includes('Mac')) {
		return 'macos';
	}
	if (ua.includes('Windows')) {
		return 'windows';
	}
	if (ua.includes('Linux')) {
		return 'linux';
	}
	return null;
}

// Detects Intel Mac via WebGL renderer string.
// Apple Silicon reports "Apple M1", "Apple M2", "Apple GPU", etc.
// Intel Macs report "Intel HD Graphics...", "Intel Iris...", etc.
function detectIsIntelMac(): boolean {
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl');
		if (gl == null) {
			return false;
		}

		const ext = gl.getExtension('WEBGL_debug_renderer_info');
		if (ext == null) {
			return false;
		}

		const renderer = (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string).toLowerCase();
		return renderer.includes('intel');
	} catch {
		return false;
	}
}
