"use client";

import { useAuth } from "@/lib/auth/AuthContext";

export default function SessionDebug() {
  const auth = useAuth();
  return (
    <pre className="p-6 text-xs bg-black text-green-400">
      {JSON.stringify(auth, null, 2)}
    </pre>
  );
}
