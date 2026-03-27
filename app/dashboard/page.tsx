import { StatsCards } from '@/components/dashboard/stats-cards';
import { CallsChart } from '@/components/dashboard/calls-chart';
import { RecentCalls } from '@/components/dashboard/recent-calls';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your AI receptionist performance at a glance</p>
      </div>
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><CallsChart /></div>
        <div><RecentCalls /></div>
      </div>
    </div>
  );
}
