import type { SavedQuote, Product } from '../types';

/**
 * Resizes and compresses a image dataUrl using Canvas
 */
export function compressImage(
  dataUrl: string, 
  maxWidth = 400, 
  maxHeight = 400, 
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = dataUrl;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };
  });
}

/**
 * Safely sets an item in localStorage, handling QuotaExceededError automatically
 * by stripping non-critical heavy fields (like base64 images) if quota is exceeded.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`localStorage.setItem failed for key "${key}":`, error);

    const isQuotaError = 
      error instanceof DOMException && (
        error.code === 22 ||
        error.code === 1014 ||
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      );

    if (isQuotaError || error?.message?.includes('exceeded the quota')) {
      if (key === 'savedQuotes') {
        try {
          // Fallback 1: Remove images from quote items
          const quotes: SavedQuote[] = JSON.parse(value);
          const sanitizedQuotes = quotes.map(q => ({
            ...q,
            items: q.items.map(item => ({
              ...item,
              product: {
                ...item.product,
                image: undefined
              }
            }))
          }));
          localStorage.setItem(key, JSON.stringify(sanitizedQuotes));
          return true;
        } catch (e1) {
          // Fallback 2: Keep only last 25 quotes without images
          try {
            const quotes: SavedQuote[] = JSON.parse(value);
            const truncatedQuotes = quotes.slice(-25).map(q => ({
              ...q,
              items: q.items.map(item => ({
                ...item,
                product: {
                  ...item.product,
                  image: undefined
                }
              }))
            }));
            localStorage.setItem(key, JSON.stringify(truncatedQuotes));
            return true;
          } catch (e2) {
            console.error('Critical: Unable to save quotes to localStorage', e2);
          }
        }
      } else if (key === 'products') {
        try {
          // Strip large base64 image data from products
          const products: Product[] = JSON.parse(value);
          const sanitizedProducts = products.map(p => ({
            ...p,
            image: p.image && p.image.length > 50000 ? undefined : p.image
          }));
          localStorage.setItem(key, JSON.stringify(sanitizedProducts));
          return true;
        } catch (e3) {
          console.error('Critical: Unable to save products to localStorage', e3);
        }
      } else if (key === 'quoteDraft') {
        try {
          const draft = JSON.parse(value);
          if (draft.quoteItems) {
            draft.quoteItems = draft.quoteItems.map((i: any) => ({
              ...i,
              product: {
                ...i.product,
                image: undefined
              }
            }));
          }
          localStorage.setItem(key, JSON.stringify(draft));
          return true;
        } catch (e4) {
          localStorage.removeItem('quoteDraft');
        }
      }
    }
    return false;
  }
}

/**
 * Encodes a UTF-8 string (including accents and special characters) into Base64 safely
 */
export function encodeUnicodeBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/**
 * Decodes a Base64 string back into a UTF-8 string with proper accent preservation
 */
export function decodeUnicodeBase64(str: string): string {
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(str), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}
