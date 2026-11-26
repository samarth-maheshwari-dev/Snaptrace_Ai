/**
 * Shrinks a photo in the browser before upload and returns JPEG base64 (no data: prefix).
 * - Phone photos are 4–8 MB; 1600px JPEG is ~300 KB and plenty for Gemini.
 * - Re-encoding through a canvas drops EXIF metadata, so GPS coordinates in the
 *   photo are never sent to the server — a real privacy issue for a campus app.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file could not be read as an image.');
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process this image.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}
