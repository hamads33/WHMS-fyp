"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
  extraItems?: { label: string; onClick: () => void }[];
};

export default function ActionsMenu({ onEdit, onDelete, extraItems = [] }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Actions">
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {extraItems.map((it, i) => (
          <DropdownMenuItem key={i} onClick={it.onClick}>{it.label}</DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => onEdit && onEdit()}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete && onDelete()}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
