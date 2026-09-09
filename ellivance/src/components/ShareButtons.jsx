export default function ShareButtons({ url, title }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    alert('Link copied.');
  }

  return (
    <div className="row row--wrap">
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
          {l.label}
        </a>
      ))}
      <button className="btn btn--ghost btn--sm" onClick={copyLink}>
        Copy link
      </button>
    </div>
  );
}
