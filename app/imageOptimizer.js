export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const OUTPUT_TYPE = 'image/webp';
const MAX_DIMENSION = 1920;

export function isSupportedImageType(type) {
  return SUPPORTED_TYPES.has(type);
}

export function ensureUploadSize(blob) {
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('사진은 최적화 후에도 5MB 이하여야 합니다.');
  }

  return blob;
}

export function getOptimizedFileName(originalName, mimeType = OUTPUT_TYPE) {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1] || 'webp';
  const baseName = originalName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return `${baseName || 'photo'}.${extension}`;
}

function getScaledSize(width, height, maxDimension) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas, type, quality) {
  if (canvas.convertToBlob) {
    return canvas.convertToBlob({ type, quality });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('이미지를 변환하지 못했습니다.'));
      }
    }, type, quality);
  });
}

function createCanvas(width, height) {
  if (globalThis.OffscreenCanvas) {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function drawToCanvas(file, maxDimension) {
  if (!globalThis.createImageBitmap) {
    throw new Error('이 브라우저는 이미지 최적화를 지원하지 않습니다.');
  }

  const bitmap = await createImageBitmap(file);
  const size = getScaledSize(bitmap.width, bitmap.height, maxDimension);
  const canvas = createCanvas(size.width, size.height);
  const context = canvas.getContext('2d');

  if (!context) {
    bitmap.close?.();
    throw new Error('이미지 캔버스를 준비하지 못했습니다.');
  }

  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close?.();
  return canvas;
}

export async function optimizeImage(file) {
  if (!isSupportedImageType(file.type)) {
    throw new Error('JPG, PNG, WebP 형식의 사진만 업로드할 수 있습니다.');
  }

  if (file.size <= MAX_UPLOAD_BYTES && file.type === OUTPUT_TYPE) {
    return {
      blob: ensureUploadSize(file),
      fileName: getOptimizedFileName(file.name, file.type),
      mimeType: file.type,
      fileSize: file.size,
    };
  }

  let maxDimension = MAX_DIMENSION;

  for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
    const canvas = await drawToCanvas(file, maxDimension);

    for (const quality of [0.86, 0.78, 0.7, 0.62, 0.54]) {
      const blob = await canvasToBlob(canvas, OUTPUT_TYPE, quality);
      if (blob.size <= MAX_UPLOAD_BYTES) {
        return {
          blob,
          fileName: getOptimizedFileName(file.name, OUTPUT_TYPE),
          mimeType: OUTPUT_TYPE,
          fileSize: blob.size,
        };
      }
    }

    maxDimension = Math.round(maxDimension * 0.75);
  }

  throw new Error('사진을 5MB 이하로 줄이지 못했습니다. 더 작은 사진을 선택해 주세요.');
}
