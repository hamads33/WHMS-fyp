"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center text-sm text-muted-foreground space-x-2 mb-6">
      {items.map((item, i) => (
        <div key={i} className="flex items-center space-x-2">
          {item.href ? (
            <Link href={item.href} className="hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
          {i < items.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </nav>
  );
}
