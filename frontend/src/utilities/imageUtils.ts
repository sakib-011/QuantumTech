/**
 * Image Processing & Client-Side Compression Utilities
 * Keeps images high quality while compressing data URLs to ~60-150KB
 * to prevent browser localStorage quota exceeded exceptions.
 */

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
];

export const isValidImageFile = (file: File): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
};

export const compressImageFile = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!isValidImageFile(file)) {
      reject(new Error('Unsupported file format. Please upload JPG, PNG, or WEBP image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        reject(new Error('Empty image data.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(src);
          return;
        }

        // Fill white background for non-PNG to avoid black backgrounds on transparent JPEGs
        if (file.type === 'image/png') {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            // If PNG is very large, convert to JPEG for storage efficiency
            if (file.size > 800 * 1024) {
              const bgCanvas = document.createElement('canvas');
              bgCanvas.width = width;
              bgCanvas.height = height;
              const bgCtx = bgCanvas.getContext('2d');
              if (bgCtx) {
                bgCtx.fillStyle = '#FFFFFF';
                bgCtx.fillRect(0, 0, width, height);
                bgCtx.drawImage(img, 0, 0, width, height);
                resolve(bgCanvas.toDataURL('image/jpeg', quality));
                return;
              }
            }
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(src);
          }
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve(src);
          }
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
};
