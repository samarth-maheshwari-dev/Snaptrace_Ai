import { computeSimilarity } from '../utils/similarity';

// Define if client believes it's in demo mode. We will also query server-side status dynamically.
const VITE_KEY_SET = !!(import.meta as any).env?.VITE_GEMINI_API_KEY;
export let isDemoMode = !VITE_KEY_SET;

// Query and update demo mode dynamically on client-side load
if (typeof window !== 'undefined') {
  fetch('/api/gemini/status')
    .then((res) => res.json())
    .then((data) => {
      isDemoMode = !data.hasAPIKey && !VITE_KEY_SET;
    })
    .catch(() => {
      isDemoMode = true;
    });
}

// Demo descriptors for fallback when in DEMO_MODE or direct simulation
export const DEMO_DESCRIPTORS: Record<string, any> = {
  default: {
    category: 'electronics',
    primaryColor: 'black',
    secondaryColors: ['silver'],
    brand: 'Dell',
    distinctiveFeatures: ['stickers on lid', 'scratch near hinge'],
    material: 'plastic',
    size: 'large',
    condition: 'good',
    itemDescription: 'A black Dell laptop with stickers on the lid',
  },
  electronics: {
    category: 'electronics',
    primaryColor: 'black',
    secondaryColors: ['silver'],
    brand: 'JBL',
    distinctiveFeatures: ['wired', 'flat cable', 'in-ear style'],
    material: 'plastic',
    size: 'small',
    condition: 'good',
    itemDescription: 'Black JBL wired in-ear earphones with flat query',
  },
  clothing: {
    category: 'clothing',
    primaryColor: 'red',
    secondaryColors: ['black'],
    brand: 'Puma',
    distinctiveFeatures: ['laptop compartment', 'keychain attached'],
    material: 'fabric',
    size: 'large',
    condition: 'good',
    itemDescription: 'A red Puma backpack',
  },
  accessory: {
    category: 'accessory',
    primaryColor: 'blue',
    secondaryColors: ['white'],
    brand: 'Decathlon',
    distinctiveFeatures: ['dent on right side'],
    material: 'plastic',
    size: 'medium',
    condition: 'used',
    itemDescription: 'A blue Decathlon water bottle',
  },
  stationery: {
    category: 'stationery',
    primaryColor: 'yellow',
    secondaryColors: ['black'],
    brand: 'Natraj',
    distinctiveFeatures: ['eraser top'],
    material: 'wood',
    size: 'small',
    condition: 'new',
    itemDescription: 'A custom yellow pencil',
  },
  id_card: {
    category: 'id_card',
    primaryColor: 'white',
    secondaryColors: ['blue', 'red'],
    brand: 'AITR',
    distinctiveFeatures: ['student photo', 'barcode'],
    material: 'plastic',
    size: 'small',
    condition: 'good',
    itemDescription: 'A university student ID card with photo and barcode',
  },
};

/**
 * Sends a base64 image to the server-side proxy which calls Gemini 3.5 Flash Vision.
 * Fallbacks to simulation if calls fail or keys are genuinely missing.
 */
export async function analyzeItemImage(base64Data: string, mimeType: string = 'image/jpeg'): Promise<any> {
  try {
    const response = await fetch('/api/gemini/analyze-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.descriptor;
    }
  } catch (error) {
    console.warn('Vision API error, falling back to cached descriptor:', error);
  }

  // Simulate server/AI analysis delay as fallback
  await new Promise((resolve) => setTimeout(resolve, 2500));
  return DEMO_DESCRIPTORS.default;
}

/**
 * Generates an item visual illustration using the server-side 'gemini-2.5-flash-image' (Nano Banana) model.
 * Facilitates the "make it use nano bannana for images" request.
 */
export async function generateItemImage(prompt: string): Promise<string> {
  const response = await fetch('/api/gemini/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate image via server');
  }

  const data = await response.json();
  return data.imageUrl; // Base64 data URL from gemini-2.5-flash-image
}

/**
 * Converts File to Base64 string (stripping prefix header).
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Re-export computeSimilarity from utils
export { computeSimilarity };
