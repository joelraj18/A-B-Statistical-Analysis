/** Display formula block — typeset with Unicode, no math runtime needed. */
export function Formula({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <figure className="my-4">
      <div className="overflow-x-auto rounded-xl bg-fill px-4 py-3.5 font-mono text-[13px] leading-relaxed text-fg">{children}</div>
      {label && <figcaption className="mt-1.5 text-[12px] text-faint">{label}</figcaption>}
    </figure>
  );
}
