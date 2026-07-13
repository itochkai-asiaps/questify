"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShowCompletedToggleProps {
  show: boolean;
  onToggle: () => void;
}

export function ShowCompletedToggle({ show, onToggle }: ShowCompletedToggleProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onToggle} className="gap-1.5">
      {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      {show ? "Hide completed" : "Show completed"}
    </Button>
  );
}
