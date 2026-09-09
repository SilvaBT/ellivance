import { useEffect, useRef } from 'react';

const TOOLS = [
  { cmd: 'bold', label: 'B', style: { fontWeight: 700 } },
  { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' } },
  { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' } },
  { cmd: 'insertUnorderedList', label: '• List' },
  { cmd: 'insertOrderedList', label: '1. List' },
  { cmd: 'formatBlock:H3', label: 'Heading' },
  { cmd: 'formatBlock:P', label: 'Text' },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current && ref.current) {
      ref.current.innerHTML = value || '';
      isFirstRender.current = false;
    }
  }, [value]);

  function exec(cmd) {
    ref.current.focus();
    if (cmd.startsWith('formatBlock:')) {
      document.execCommand('formatBlock', false, cmd.split(':')[1]);
    } else if (cmd === 'createLink') {
      const url = prompt('Link URL');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    onChange(ref.current.innerHTML);
  }

  return (
    <div className="rte">
      <div className="rte__toolbar">
        {TOOLS.map((t) => (
          <button key={t.label} type="button" className="rte__btn" style={t.style} onClick={() => exec(t.cmd)}>
            {t.label}
          </button>
        ))}
        <button type="button" className="rte__btn" onClick={() => exec('createLink')}>
          🔗 Link
        </button>
      </div>
      <div
        ref={ref}
        className="rte__content"
        contentEditable
        data-placeholder={placeholder}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}
