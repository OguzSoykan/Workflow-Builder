import { useId, useRef, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

// WAI-ARIA tabs with arrow-key navigation. Inactive panels stay mounted (hidden) so form state survives.
export function Tabs({
  label,
  items,
  active,
  onChange,
  className = '',
}: {
  label: string;
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (offset: number) => {
    const index = items.findIndex((item) => item.id === active);
    const next = items[(index + offset + items.length) % items.length];
    if (!next) return;
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div className={`tabs ${className}`}>
      <div className="tab-list" role="tablist" aria-label={label}>
        {items.map((item) => (
          <button
            key={item.id}
            ref={(element) => {
              refs.current[item.id] = element;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${item.id}`}
            aria-selected={item.id === active}
            aria-controls={`${base}-panel-${item.id}`}
            tabIndex={item.id === active ? 0 : -1}
            className="tab"
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') move(1);
              if (event.key === 'ArrowLeft') move(-1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${base}-panel-${item.id}`}
          aria-labelledby={`${base}-tab-${item.id}`}
          className="tab-panel"
          hidden={item.id !== active}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
