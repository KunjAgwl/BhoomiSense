import { useEffect, useRef, useState } from 'react';
import './BrutalSelect.css';

/**
 * Custom brutalist dropdown (Section 5) — thick border, triangle SVG arrow,
 * no native browser select styling. Closes on outside click / Escape.
 */
export default function BrutalSelect({ label, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="brutal-select" ref={rootRef}>
      <span className="brutal-select__label mono">{label.toUpperCase()}</span>
      <button
        type="button"
        className="brutal-select__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`brutal-select__value ${selected ? '' : 'is-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`brutal-select__arrow ${open ? 'is-open' : ''}`}
          width="14"
          height="10"
          viewBox="0 0 14 10"
          aria-hidden="true"
        >
          <path d="M1 1.5 L7 8.5 L13 1.5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" />
        </svg>
      </button>

      {open && (
        <ul className="brutal-select__list" role="listbox" ref={listRef}>
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                className={`brutal-select__option ${opt.value === value ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
