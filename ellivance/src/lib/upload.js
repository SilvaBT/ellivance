import { supabase } from '../supabaseClient';

/**
 * Resizes an image file down to a max dimension and re-encodes it as JPEG
 * at a fixed quality, entirely in the browser via canvas. This is the
 * "automatic optimisation / compression" step — it runs before every
 * upload so large phone-camera photos don't bloat storage or load times.
 */
export function compressImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(bucket, userId, file) {
  const compressed = await compressImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
