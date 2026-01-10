import { Suspense } from 'react';
import DashboardContent from '@/components/dashboard/dashboard-content';

export default function DashboardPage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white bg-black">Loading Dashboard...</div>}>
			<DashboardContent />
		</Suspense>
	);
}