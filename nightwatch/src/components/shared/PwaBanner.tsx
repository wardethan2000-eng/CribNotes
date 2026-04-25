"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function PwaBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const pwaBannerDismissed = useAppStore((s) => s.pwaBannerDismissed);
  const dismissPwaBanner = useAppStore((s) => s.dismissPwaBanner);

  useEffect(() => {
    try {
      const visited = localStorage.getItem("nw-visited");
      if (!visited) {
        localStorage.setItem("nw-visited", "1");
      } else if (!pwaBannerDismissed) {
        setIsVisible(true);
      }
    } catch {}
  }, [pwaBannerDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissPwaBanner();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-elevated text-text-secondary px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm">
        Add NightWatch to your home screen for the best experience.
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleDismiss} className="text-primary text-sm font-medium">
          Add
        </button>
        <button onClick={handleDismiss} className="text-text-muted hover:text-primary">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}