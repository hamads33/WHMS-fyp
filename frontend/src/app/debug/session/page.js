"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SessionDebug() {
  const auth = useAuth();

  const handleReload = () => {
    auth.loadSession();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Session Debug</h1>
        <Button onClick={handleReload}>Reload Session</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auth Context State</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="p-4 text-xs bg-black text-green-400 rounded-lg overflow-auto max-h-[600px]">
            {JSON.stringify(
              {
                user: auth.user,
                portal: auth.portal,
                impersonating: auth.impersonating,
                impersonator: auth.impersonator,
                loading: auth.loading,
                error: auth.error,
                isAuthenticated: auth.isAuthenticated,
                isAdmin: auth.isAdmin,
                isClient: auth.isClient,
                isDeveloper: auth.isDeveloper,
                isReseller: auth.isReseller,
              },
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button onClick={() => auth.loadSession()}>
              Reload Session
            </Button>
            <Button variant="destructive" onClick={() => auth.logout()}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}