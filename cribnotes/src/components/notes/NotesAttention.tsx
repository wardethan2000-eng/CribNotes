"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, Pin } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const audienceLabels: Record<string, string> = {
  EVERYONE: "Everyone",
  PARENTS: "Parents",
  CAREGIVERS: "Caretakers",
  SPECIFIC: "Specific",
};

export function NotesAttention() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);

  const { data, isLoading } = useQuery({
    queryKey: ["notes", selectedChildId, "attention"],
    queryFn: () =>
      fetch(`/api/notes?childId=${selectedChildId}&attention=mine&limit=3`).then((r) => r.json()),
    enabled: !!selectedChildId,
  });

  const notes = Array.isArray(data?.notes) ? data.notes : [];

  if (!selectedChildId || isLoading || notes.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold text-text-primary">Notes for You</h2>
        <Link href="/notes" className="text-sm font-medium text-primary">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {notes.map((note: any) => (
          <Link
            key={note.id}
            href="/notes"
            className="block bg-surface border border-border rounded-2xl p-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl text-primary bg-primary/10 shrink-0">
                <MessageSquareText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {note.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <p className="text-sm font-medium text-text-primary truncate">{note.title}</p>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 mt-1">{note.body}</p>
                <p className="text-xs text-text-muted mt-2">
                  {audienceLabels[note.audience] || "Everyone"} · {note.authorKind} · {formatRelativeTime(new Date(note.createdAt))}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
