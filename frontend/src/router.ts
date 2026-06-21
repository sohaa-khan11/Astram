import { useEffect, useState } from 'react';

export const ROUTES = [
  'present-map',
  'historical-map',
  'hotspots',
  'tow-fleet',
  'dispatch-tracking',
  'traffic-dispatch',
  'triage',
  'sandbox',
  'analytics'
] as const;
export type Route = typeof ROUTES[number];
const DEFAULT_ROUTE: Route = 'present-map';

interface RouteState {
  route: Route;
  params: URLSearchParams;
}

function parseHash(hash: string): RouteState {
  const parts = hash.replace(/^#\/?/, '').split('?');
  const path = parts[0];
  const search = parts[1] || '';
  const route = (ROUTES as readonly string[]).includes(path) ? (path as Route) : DEFAULT_ROUTE;
  const params = new URLSearchParams(search);
  return { route, params };
}

export function useRoute(): RouteState {
  const [navState, setNavState] = useState<RouteState>(() => parseHash(window.location.hash));

  useEffect(() => {
    const rawHash = window.location.hash;
    
    // Redirect if empty or invalid route
    const pathPart = rawHash.replace(/^#\/?/, '').split('?')[0];
    if (!rawHash || !(ROUTES as readonly string[]).includes(pathPart)) {
      window.location.replace(`#/${DEFAULT_ROUTE}`);
    }

    const onHashChange = () => setNavState(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return navState;
}

export function navigate(route: Route, params?: Record<string, string | number>) {
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => searchParams.set(key, String(val)));
    window.location.hash = `/${route}?${searchParams.toString()}`;
  } else {
    window.location.hash = `/${route}`;
  }
}
