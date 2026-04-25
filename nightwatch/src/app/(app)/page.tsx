"use client";

import QuickLogGrid from "@/components/dashboard/QuickLogGrid";
import RecentActivity from "@/components/dashboard/RecentActivity";

export default function DashboardPage() {
  return (
    <div className="px-4 pt-4 pb-4">
      <QuickLogGrid />
      <div className="mt-8">
        <RecentActivity />
      </div>
    </div>
  );
}