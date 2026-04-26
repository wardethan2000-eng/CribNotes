"use client";

import { useState } from "react";
import { Moon, Baby, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatChildAge } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface OnboardingFlowProps {
  userName: string;
}

export function OnboardingFlow({ userName }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"CAREGIVER" | "VIEWER">("CAREGIVER");
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useSession();
  const { setSelectedChildId, setOnboarded } = useAppStore();

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: childName, birthDate: childDob }),
      });
      if (!res.ok) throw new Error("Failed");
      const child = await res.json();
      setCreatedChildId(child.id);
      setSelectedChildId(child.id);
      toast.success("Child added!");
      setStep(3);
    } catch {
      toast.error("Failed to add child");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !createdChildId) {
      setStep(4);
      return;
    }
    try {
      const res = await fetch(`/api/children/${createdChildId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invite sent!");
    } catch {
      toast.error("Failed to send invite");
    }
    setStep(4);
  };

  const finishOnboarding = async () => {
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDone: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setOnboarded(true);
      await update();
      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="bg-surface rounded-2xl p-6">
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Moon className="text-primary" size={32} />
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Welcome to CribNotes</h1>
              <p className="text-text-secondary mb-6">Track your baby&apos;s night activity, effortlessly</p>
              <Button full onClick={() => setStep(2)}>Let&apos;s get started</Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleAddChild}>
              <h2 className="font-display text-xl font-bold text-text-primary mb-1">Add Your Child</h2>
              <p className="text-text-secondary mb-6">Tell us about your little one</p>
              <div className="space-y-4">
                <Input label="Child's Name" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Name" required />
                <Input label="Date of Birth" type="date" value={childDob} onChange={(e) => setChildDob(e.target.value)} required />
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" full>Add Child</Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleInvite}>
              <h2 className="font-display text-xl font-bold text-text-primary mb-1">Invite a Co-Parent</h2>
              <p className="text-text-secondary mb-6">Share access with a partner or caregiver</p>
              <div className="space-y-4">
                <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="partner@email.com" />
                <div>
                  <p className="text-sm text-text-secondary mb-2">Role</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteRole("CAREGIVER")}
                      className={`flex-1 px-4 py-2 rounded-full text-sm ${inviteRole === "CAREGIVER" ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}
                    >
                      Caregiver
                    </button>
                    <button
                      type="button"
                      onClick={() => setInviteRole("VIEWER")}
                      className={`flex-1 px-4 py-2 rounded-full text-sm ${inviteRole === "VIEWER" ? "bg-secondary text-base" : "bg-elevated text-text-secondary"}`}
                    >
                      Viewer
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button type="submit" full>
                  <UserPlus size={16} className="mr-1" /> Send Invite
                </Button>
              </div>
              <button type="button" onClick={() => setStep(4)} className="text-sm text-text-muted mt-3 block mx-auto hover:text-text-secondary">
                Skip for now
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check className="text-success" size={32} />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary mb-2">You&apos;re all set, {userName}!</h2>
              <div className="bg-elevated rounded-2xl p-4 mt-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Baby className="text-primary" size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-text-primary">{childName}</p>
                    <p className="text-sm text-text-secondary">
                      {childDob ? formatChildAge(new Date(childDob)) : ""}
                    </p>
                  </div>
                </div>
              </div>
              <Button full onClick={finishOnboarding}>Start Tracking</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
