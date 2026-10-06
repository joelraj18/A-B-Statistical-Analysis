import type { Metadata } from 'next';
import { HistoryView } from '@/components/views/HistoryView';

export const metadata: Metadata = { title: 'Experiment Archive' };

export default function HistoryPage() {
  return <HistoryView />;
}
