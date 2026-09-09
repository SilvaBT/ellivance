export default function StarRating({ value = 0, onChange, size = 18 }) {
  const interactive = !!onChange;
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => interactive && onChange(n)}
          style={{ cursor: interactive ? 'pointer' : 'default', opacity: n <= Math.round(value) ? 1 : 0.3 }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
