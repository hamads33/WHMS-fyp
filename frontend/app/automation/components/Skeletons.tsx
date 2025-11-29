"use client";

import React from "react";

export function ProfileSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3 border rounded animate-pulse bg-gray-100 h-12" />
      ))}
    </div>
  );
}

export function CardSkeleton({ rows = 3 }:{ rows?:number }) {
  return (
    <div className="p-4 border rounded space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}
