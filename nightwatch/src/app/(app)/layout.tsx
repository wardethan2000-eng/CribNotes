import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Header } from "@/components/shared/Header";
import { ChildSelector } from "@/components/shared/ChildSelector";
import { BottomNav } from "@/components/shared/BottomNav";
import { PwaBanner } from "@/components/shared/PwaBanner";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.onboardingDone) {
    redirect("/onboarding");
  }

  return (
    <SessionProvider session={session}>
      <div className="max-w-lg mx-auto min-h-screen bg-base flex flex-col">
        <Header />
        <ChildSelector />
        <PwaBanner />
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>
        <BottomNav />
        <Toaster theme="dark" position="top-center" richColors />
      </div>
    </SessionProvider>
  );
}