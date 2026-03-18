function isLocalHostname(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function normalizeConfiguredUrl(configuredUrl: string, pathSuffix = ''): string {
    if (typeof window === 'undefined') {
        return configuredUrl;
    }

    try {
        const url = new URL(configuredUrl);
        const pageHostname = window.location.hostname;

        // If the app is being accessed remotely, "localhost" would point to the user's machine.
        if (isLocalHostname(url.hostname) && !isLocalHostname(pageHostname)) {
            url.hostname = pageHostname;
        }

        return `${url.origin}${pathSuffix}`;
    } catch {
        return configuredUrl.replace(/\/api\/?$/, pathSuffix);
    }
}

export function resolveApiBaseUrl(): string {
    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (configuredApiUrl) {
        return normalizeConfiguredUrl(configuredApiUrl, '/api');
    }

    return '/backend-api/api';
}

export function resolveBackendOrigin(): string {
    const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (configuredApiUrl) {
        return normalizeConfiguredUrl(configuredApiUrl, '');
    }

    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:3500`;
    }

    return 'http://localhost:3500';
}
