import type { Metadata } from 'next';
import { AnalyzerView } from '@/components/views/AnalyzerView';

export const metadata: Metadata = { title: 'A/B Analyzer' };

export default function AnalyzerPage() {
  return <AnalyzerView />;
}
