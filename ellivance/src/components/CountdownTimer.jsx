import { useEffect, useState } from 'react';

function getParts(target) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff <= 0,
  };
}

export default function CountdownTimer({ target }) {
  const [parts, setParts] = useState(() => getParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.done) {
    return <span className="pill pill--live pill--dot">Happening now / started</span>;
  }

  const unit = (v, label) => (
    <div style={{ textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
        {String(v).padStart(2, '0')}
      </div>
      <div className="help-text" style={{ fontSize: 11, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );

  return (
    <div className="row" style={{ gap: 18 }}>
      {unit(parts.days, 'days')}
      {unit(parts.hours, 'hrs')}
      {unit(parts.minutes, 'min')}
      {unit(parts.seconds, 'sec')}
    </div>
  );
}
