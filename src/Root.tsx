import { useEffect, useState } from 'react'
import App from './App'
import { LandingPage } from './marketing/LandingPage'
import { APP_PATH } from './marketing/site'

function pathIsApp(pathname: string): boolean {
  return pathname === APP_PATH || pathname.startsWith(`${APP_PATH}/`)
}

/**
 * Lightweight client router — marketing homepage at `/`, working app at `/app`.
 * Avoids adding react-router; Netlify SPA fallback is in public/_redirects.
 */
export function Root() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  if (pathIsApp(pathname)) {
    return <App />
  }

  return <LandingPage />
}
