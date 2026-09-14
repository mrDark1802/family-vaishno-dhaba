import React, { createContext, useContext, useState, useEffect } from 'react';

export interface NavigationContextType {
  currentPath: string;
  navigate: (path: string) => void;
  params: Record<string, string>;
  searchParams: URLSearchParams;
}

const NavigationContext = createContext<NavigationContextType>({
  currentPath: '/',
  navigate: () => {},
  params: {},
  searchParams: new URLSearchParams(),
});

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getHashPath = () => {
    const hash = window.location.hash.slice(1);
    return hash ? hash : '/';
  };

  const [currentPath, setCurrentPath] = useState<string>(getHashPath());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getHashPath());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  // Parse path & search params
  const [pathname, queryString] = currentPath.split('?');
  const searchParams = new URLSearchParams(queryString || '');

  // Dynamic route matching (e.g. /menu/dish-1, /orders/ord-1)
  const params: Record<string, string> = {};
  if (pathname.startsWith('/menu/') && pathname !== '/menu/new') {
    params.id = pathname.replace('/menu/', '');
  } else if (pathname.startsWith('/orders/')) {
    params.id = pathname.replace('/orders/', '');
  }

  return (
    <NavigationContext.Provider value={{ currentPath, navigate, params, searchParams }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useRouter = () => {
  const { navigate } = useContext(NavigationContext);
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path),
    back: () => window.history.back(),
  };
};

export const usePathname = () => {
  const { currentPath } = useContext(NavigationContext);
  return currentPath.split('?')[0] || '/';
};

export const useParams = () => {
  const { params } = useContext(NavigationContext);
  return params;
};

export const useSearchParams = () => {
  const { searchParams } = useContext(NavigationContext);
  return searchParams;
};

export const Link: React.FC<{
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ href, className, children, onClick }) => {
  const { navigate } = useContext(NavigationContext);
  return (
    <a
      href={`#${href}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(href);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
};
