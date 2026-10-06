import type { Metadata } from 'next';
import { PlannerView } from '@/components/views/PlannerView';

export const metadata: Metadata = { title: 'Sample Planner' };

export default function PlannerPage() {
  return <PlannerView />;
}
