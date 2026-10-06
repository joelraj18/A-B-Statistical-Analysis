'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

const inputBase =
  'w-full rounded-xl border border-hairline bg-elevated/70 px-3 text-[15px] text-fg placeholder:text-faint outline-none transition ' +
  'focus:border-accent focus:ring-4 focus:ring-accent-soft dark:bg-white/[0.04]';

interface FieldShellProps {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  id: string;
  children: React.ReactNode;
  className?: string;
  trailing?: React.ReactNode;
}

function FieldShell({ label, hint, error, id, children, className, trailing }: FieldShellProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-medium tracking-tight text-muted">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 text-[12px] text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1.5 text-[12px] leading-relaxed text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | 'any';
  suffix?: string;
  prefix?: string;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  integer?: boolean;
}

export function NumberField({ label, value, onChange, min, max, step = 'any', suffix, prefix, hint, error, className, integer }: NumberFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} className={className}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[15px] text-faint">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode={integer ? 'numeric' : 'decimal'}
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={integer ? 1 : step}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          className={cn(inputBase, 'tabular h-11', prefix && 'pl-7', suffix && 'pr-10', error && 'border-negative')}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-faint">{suffix}</span>}
      </div>
    </FieldShell>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
  className?: string;
  maxLength?: number;
}

export function TextField({ label, value, onChange, placeholder, hint, multiline, rows = 3, className, maxLength }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} id={id} className={className}>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputBase, 'resize-none py-2.5 leading-relaxed')}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputBase, 'h-11')}
        />
      )}
    </FieldShell>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  hint?: React.ReactNode;
  className?: string;
}

export function Slider({ label, value, onChange, min, max, step, format, hint, className }: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <FieldShell
      label={label}
      hint={hint}
      id={id}
      className={className}
      trailing={<span className="tabular text-[15px] font-semibold tracking-tight text-fg">{format(value)}</span>}
    >
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={format(value)}
        className="ios-slider w-full"
        style={{ '--fill-pct': `${pct}%` } as React.CSSProperties}
      />
    </FieldShell>
  );
}
