import { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import { uploadImage } from '../lib/upload.js';

/**
 * Single mode: value is a url string (or ''), onChange(url)
 * Multiple mode: value is an array of urls, onChange(urls)
 */
export default function ImageUploader({ bucket, multiple = false, value, onChange, label }) {
  const { user } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadImage(bucket, user.id, file);
        urls.push(url);
      }
      if (multiple) {
        onChange([...(value || []), ...urls]);
      } else {
        onChange(urls[0]);
      }
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  function removeAt(i) {
    if (multiple) onChange(value.filter((_, idx) => idx !== i));
    else onChange('');
  }

  return (
    <div className="stack-sm">
      {label && <span className="label">{label}</span>}
      <div
        className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {uploading ? 'Uploading…' : 'Drag & drop image(s) here, or click to browse'}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {multiple ? (
        (value || []).length > 0 && (
          <div className="thumb-grid">
            {value.map((url, i) => (
              <div className="thumb" key={url + i}>
                <img src={url} alt="" />
                <button type="button" className="thumb__remove" onClick={() => removeAt(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        value && (
          <div className="thumb" style={{ width: 160, height: 100 }}>
            <img src={value} alt="" />
            <button type="button" className="thumb__remove" onClick={() => removeAt(0)}>
              ×
            </button>
          </div>
        )
      )}
    </div>
  );
}
