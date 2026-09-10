import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type AppRoute = '/login' | '/admin' | '/dashboard' | '/app' | '/';

interface RouterContextType {
  currentPath: string;
  navigate: (to: string) => void;
  pathname: string;
}

const RouterContext = createContext<RouterContextType>({
  currentPath: '/',
  navigate: () => {},
  pathname: '/',
});

function normalizePath(rawPath: string, hash: string): string {
  // Soporte para hash (#/admin -> /admin o #admin -> /admin)
  if (hash && hash.length > 1) {
    const cleanHash = hash.replace(/^#\/?/, '/');
    if (['/admin', '/dashboard', '/app', '/login'].some(p => cleanHash.startsWith(p))) {
      return cleanHash;
    }
  }

  const clean = rawPath.replace(/\/$/, '') || '/';
  if (clean.includes('/admin')) return '/admin';
  if (clean.includes('/dashboard')) return '/dashboard';
  if (clean.includes('/app')) return '/app';
  if (clean.includes('/login')) return '/login';
  return clean === '' ? '/' : clean;
}

export const RouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return normalizePath(window.location.pathname, window.location.hash);
    }
    return '/';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const normalized = normalizePath(window.location.pathname, window.location.hash);
      setPathname(normalized);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window !== 'undefined') {
      const targetUrl = to.startsWith('/') ? to : `/${to}`;
      window.history.pushState({}, '', targetUrl);
      const normalized = normalizePath(targetUrl, '');
      setPathname(normalized);
      // Scroll to top upon route change
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath: pathname, navigate, pathname }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => useContext(RouterContext);
