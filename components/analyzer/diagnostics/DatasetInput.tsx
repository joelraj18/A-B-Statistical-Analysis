'use client';

import { Database, FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { formatNum } from '@/lib/stats/format';
import type { DatasetSource } from '@/lib/store/workspace';
import type { StoryId } from '@/lib/stories/ids';

interface DatasetInputProps {
  source: DatasetSource;
  onChange: (source: DatasetSource) => void;
  /** Persona dataset offered by "Load example". */
  exampleStory: StoryId;
  exampleLabel: string;
  placeholder: string;
  rows: number;
  label?: string;
  ariaLabel: string;
}

/** CSV paste / upload, or a chip for a seeded persona dataset. */
export function DatasetInput({ source, onChange, exampleStory, exampleLabel, placeholder, rows, label, ariaLabel }: DatasetInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onFile = async (file: File | undefined) => {
    if (file) onChange({ kind: 'csv', text: await file.text() });
  };
  const hasData = source.kind === 'story' || source.text.trim().length > 0;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" icon={<Database />} onClick={() => onChange({ kind: 'story', storyId: exampleStory })}>
          {exampleLabel}
        </Button>
        <Button variant="secondary" size="sm" icon={<Upload />} onClick={() => fileRef.current?.click()}>
          Upload CSV
        </Button>
        {hasData && (
          <Button variant="ghost" size="sm" icon={<X />} onClick={() => onChange({ kind: 'csv', text: '' })}>
            Clear
          </Button>
        )}
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>

      {source.kind === 'story' ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-accent-soft px-4 py-3 text-[13px] text-accent">
          <FileSpreadsheet className="size-4 shrink-0" />
          <span className="font-medium">{label ?? 'Example dataset'}</span>
          <span className="tabular ml-auto text-fg-secondary">{formatNum(rows)} rows</span>
        </div>
      ) : (
        <>
          <textarea
            value={source.text}
            onChange={(e) => onChange({ kind: 'csv', text: e.target.value })}
            rows={5}
            spellCheck={false}
            aria-label={ariaLabel}
            placeholder={placeholder}
            className="mt-4 w-full resize-y rounded-xl border border-hairline bg-elevated/70 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg outline-none transition placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent-soft dark:bg-white/[0.04]"
          />
          {rows > 0 && <p className="mt-1.5 text-[12px] text-faint">{formatNum(rows)} rows parsed</p>}
        </>
      )}
    </div>
  );
}
