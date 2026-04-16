'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getToken, getRole, isAdmin } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

const publicRoutes = ['/login', '/register', '/'];
const adminRoutes = ['/tenants', '/commands', '/billing/admin'];

export function AuthWrapper({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    const isPublicRoute = publicRoutes.includes(pathname);

    // If no token and not on public route, redirect to login
    if (!token && !isPublicRoute) {
      router.push('/login');
      return;
    }

    // If token exists and on public route, redirect to dashboard
    if (token && isPublicRoute) {
      router.push('/dashboard');
      return;
    }

    // Check admin routes
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (!isAdmin()) {
        router.push('/dashboard');
        return;
      }
    }

    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, [pathname, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto lg:ml-64">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Public routes (no sidebar)
  return <>{children}</>;
}
