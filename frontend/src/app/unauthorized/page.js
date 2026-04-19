"use client";

import { useAuth } from "@/lib/context/AuthContext";

export default function UnauthorizedPage() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="text-6xl font-bold text-red-500">403</div>
        <h1 className="text-2xl font-semibold text-gray-800">Access Denied</h1>
        <p className="text-gray-500">
          You don&apos;t have permission to access this page. If you were
          impersonating a user, your session may have expired.
        </p>
        <button
          onClick={logout}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}
