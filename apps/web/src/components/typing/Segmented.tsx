/** A row of mutually exclusive options (radio group), styled like the layout tabs. */
export default function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      className="inline-flex rounded-lg border border-border bg-surface p-0.5"
    >
      {props.options.map((o) => {
        const checked = o.value === props.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => !checked && props.onChange(o.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              checked ? "bg-accent text-accent-fg" : "text-muted hover:text-text"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
