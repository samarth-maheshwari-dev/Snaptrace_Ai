import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ((import.meta as any).env?.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Log configuration status safely
if (isSupabaseConfigured) {
  console.log('✅ Supabase initialized successfully.');
} else {
  console.warn('⚠️ VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not set. Using full-stack Server Fallback Mode.');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Upload image to Supabase if configured, or fallback to server-side uploads.
 */
export async function uploadItemImage(file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('item-images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });
    
    if (error) {
      console.error('Supabase storage upload error, falling back:', error);
      throw error;
    }
    const { data } = supabase.storage.from('item-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // FALLBACK: Upload to Express backend "/api/upload"
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(',')[1];
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64: base64Data,
          }),
        });

        if (!response.ok) {
          throw new Error('Image upload failed on local server.');
        }

        const data = await response.json();
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
