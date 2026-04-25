"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Moon, Baby, Droplets } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import QuickLogButton from "@/components/dashboard/QuickLogButton";
import FeedDetailsSheet from "@/components/dashboard/FeedDetailsSheet";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";

export default function QuickLogGrid() {
  const queryClient = useQueryClient();
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  const [feedSheetOpen, setFeedSheetOpen] = useState(false);
  const [feedLogId, setFeedLogId] = useState<string | null>(null);

  const { data: children } = useQueryClient().getQueryData(["children"]) as any;

  const logMutation = useMutation({
    mutationFn: (data: { type: string; childId: string; occurredAt: string }) =>
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Failed to log");
        return r.json();
      }),
  });

  const handleLog = (type: "WAKE" | "FEED" | "DIAPER") => {
    if (!selectedChildId) {
      toast.error("Please select a child first");
      return;
    }
    const now = new Date().toISOString();
    const time = format(new Date(), "h:mm a");

    logMutation.mutate(
      { type, childId: selectedChildId, occurredAt: now },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["logs"] });
          if (type === "FEED") {
            setFeedLogId(data.id);
            setFeedSheetOpen(true);
          } else {
            const messages: Record<string, string> = {
              WAKE: `Logged: woke up at ${time}`,
              DIAPER: `Logged: diaper change at ${time}`,
            };
            toast.success(messages[type]);
          }
        },
        onError: () => {
          toast.error("Failed to log event");
        },
      }
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <QuickLogButton
          icon={Moon}
          label="Woke Up"
          color="warning"
          onClick={() => handleLog("WAKE")}
        />
        <QuickLogButton
          icon={Baby}
          label="Fed"
          color="primary"
          onClick={() => handleLog("FEED")}
        />
      </div>
      <div className="w-full max-w-[160px]">
        <QuickLogButton
          icon={Droplets}
          label="Diaper"
          color="secondary"
          onClick={() => handleLog("DIAPER")}
        />
      </div>
      <FeedDetailsSheet
        open={feedSheetOpen}
        onClose={() => setFeedSheetOpen(false)}
        logId={feedLogId}
      />
    </div>
  );
}