export function Repeater({ items, emptyItem, onChange, renderItem, addLabel }) {
  function update(index, patch) {
    const next = items.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...items, { ...emptyItem, _key: crypto.randomUUID() }]);
  }

  return (
    <div className="stack">
      {items.map((item, i) => (
        <div className="repeater-item" key={item._key || i}>
          <button
            type="button"
            className="thumb__remove"
            style={{ position: 'absolute', top: 10, right: 10 }}
            onClick={() => remove(i)}
          >
            ×
          </button>
          {renderItem(item, (patch) => update(i, patch))}
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={add} style={{ alignSelf: 'flex-start' }}>
        + {addLabel}
      </button>
    </div>
  );
}

export function TagInput({ value, onChange, placeholder }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = e.currentTarget.value.trim();
      if (v && !value.includes(v)) onChange([...value, v]);
      e.currentTarget.value = '';
    }
  }
  return (
    <div className="row row--wrap" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 8, gap: 6 }}>
      {value.map((tag) => (
        <span className="pill pill--accent" key={tag}>
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        style={{ border: 'none', outline: 'none', flex: 1, minWidth: 100, fontSize: 14 }}
      />
    </div>
  );
}
