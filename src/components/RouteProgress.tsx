import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Brief animated bar across the top on every route change. All pages are
 * bundled together (no code-splitting), so there's no real async load to
 * wait on - this is purely a sense-of-motion cue, not a real progress
 * indicator. Remounting via `key` re-triggers the CSS animation each time.
 */
export function RouteProgress() {
  const location = useLocation();
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((k) => k + 1);
  }, [location.pathname]);

  return <div key={key} className="route-progress" />;
}
