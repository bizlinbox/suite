export const dynamic = 'force-dynamic';

function fetchWithTimeout(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { cache: 'no-store', signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

function redirectResponse(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

export async function GET() {
  const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:4000';

  try {
    const res = await fetchWithTimeout(`${apiUrl}/api/v1/auth/setup-required`);
    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }
    const data = await res.json();
    if (data.needsSetup) {
      return redirectResponse('/setup');
    }
    return redirectResponse('/login');
  } catch {
    // If backend is unreachable (e.g. first boot), redirect to /setup.
    // /setup has its own guard and will bounce to /login if setup is done.
    return redirectResponse('/setup');
  }
}
