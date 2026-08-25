/**
 * Universal High-Performance Image Compression Utility
 * Resizes and compresses image files (JPEG, PNG, WebP, HEIC/camera shots)
 * before transferring or saving to storage/database.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.75,
  mimeType: 'image/jpeg',
};

/**
 * Checks if a given input or file name/mime type represents an image.
 */
export function isImageLike(input: unknown): boolean {
  if (!input) return false;
  if (typeof input === 'string') {
    return (
      input.startsWith('data:image/') ||
      /\.(jpg|jpeg|png|webp|gif|bmp|heic|svg)($|\?)/i.test(input)
    );
  }
  if (input instanceof File || input instanceof Blob) {
    return (
      input.type.startsWith('image/') ||
      (input instanceof File && /\.(jpg|jpeg|png|webp|gif|bmp|heic|svg)$/i.test(input.name))
    );
  }
  return false;
}

/**
 * Compresses an HTML Image object to a Canvas, returning the dataURL and Blob.
 */
function compressImageElement(
  img: HTMLImageElement,
  options: Required<CompressionOptions>,
  originalName: string = 'image.jpg'
): Promise<{ blob: Blob; file: File; dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    try {
      let { width, height } = img;
      const { maxWidth, maxHeight, quality, mimeType } = options;

      // Calculate scaled dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / maxWidth > height / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      width = Math.max(1, Math.round(width));
      height = Math.max(1, Math.round(height));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: mimeType !== 'image/jpeg' });
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      // If rendering to JPEG, paint white background for transparent PNGs
      if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const targetMime = mimeType;
      const dataUrl = canvas.toDataURL(targetMime, quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback: decode dataURL to Blob
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const fallbackBlob = new Blob([ab], { type: targetMime });
            const file = new File([fallbackBlob], cleanFileName(originalName, targetMime), {
              type: targetMime,
              lastModified: Date.now(),
            });
            resolve({ blob: fallbackBlob, file, dataUrl, width, height });
          } else {
            const file = new File([blob], cleanFileName(originalName, targetMime), {
              type: targetMime,
              lastModified: Date.now(),
            });
            resolve({ blob, file, dataUrl, width, height });
          }
        },
        targetMime,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

function cleanFileName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^/.]+$/, '');
  const ext = mimeType === 'image/webp' ? '.webp' : mimeType === 'image/png' ? '.png' : '.jpg';
  return `${base || 'image'}${ext}`;
}

/**
 * Compresses an image File/Blob and returns compressed File, Blob, and DataURL.
 */
export async function compressImageFile(
  file: File | Blob,
  customOptions?: CompressionOptions
): Promise<{ file: File; blob: Blob; dataUrl: string; width: number; height: number }> {
  const options: Required<CompressionOptions> = { ...DEFAULT_OPTIONS, ...customOptions };
  const fileName = file instanceof File ? file.name : 'image.jpg';

  // If SVG or non-image, skip compression safely
  if (file.type === 'image/svg+xml') {
    const dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    const outFile = file instanceof File ? file : new File([file], fileName, { type: file.type });
    return { file: outFile, blob: file, dataUrl, width: 0, height: 0 };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const result = await compressImageElement(img, options, fileName);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      // If image loading fails, fallback to FileReader
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const outFile = file instanceof File ? file : new File([file], fileName, { type: file.type || 'image/jpeg' });
        resolve({ file: outFile, blob: file, dataUrl, width: 0, height: 0 });
      };
      reader.onerror = () => reject(err);
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Compresses a base64 or DataURL image string and returns a compressed DataURL.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  customOptions?: CompressionOptions
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  if (dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  const options: Required<CompressionOptions> = { ...DEFAULT_OPTIONS, ...customOptions };

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const result = await compressImageElement(img, options);
        resolve(result.dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
