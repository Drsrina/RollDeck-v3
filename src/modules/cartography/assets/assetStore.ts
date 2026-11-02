/**
 * Asset Library & Storage Engine
 * Manages project assets in IndexedDB with in-memory caching and automatic downscaling.
 */

import { Asset } from '../types/map';

const DB_NAME = 'cartografo_assets_db';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryCache = new Map<string, Asset>();

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não disponível'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function saveAsset(asset: Asset): Promise<void> {
  memoryCache.set(asset.id, asset);
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(asset);
  } catch (e) {
    // Graceful in-memory fallback
    console.warn('IndexedDB indisponível, asset mantido em memória:', e);
  }
}

export async function getAsset(id: string): Promise<Asset | null> {
  if (memoryCache.has(id)) return memoryCache.get(id)!;
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const res = req.result as Asset | undefined;
        if (res) memoryCache.set(res.id, res);
        resolve(res || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getAllAssets(): Promise<Asset[]> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const res = req.result as Asset[];
        res.forEach((a) => memoryCache.set(a.id, a));
        resolve(res);
      };
      req.onerror = () => resolve(Array.from(memoryCache.values()));
    });
  } catch {
    return Array.from(memoryCache.values());
  }
}

export async function deleteAsset(id: string): Promise<void> {
  memoryCache.delete(id);
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    // fallback
  }
}

/**
 * Process and optimize user uploaded image file with alpha preservation and downscaling.
 */
export async function fileToAsset(
  file: File,
  role: Asset['role'] = 'stamp',
  tags: string[] = []
): Promise<Asset> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const maxDimension = 2048;
  let finalWidth = img.width;
  let finalHeight = img.height;
  let finalDataUrl = dataUrl;

  // Downscale if image is gigantic
  if (img.width > maxDimension || img.height > maxDimension) {
    const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
    finalWidth = Math.round(img.width * scale);
    finalHeight = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
      finalDataUrl = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92);
    }
  }

  // Detect alpha channel
  const hasAlpha = checkImageHasAlpha(img);

  const asset: Asset = {
    id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: file.name.replace(/\.[^/.]+$/, ''),
    mime: file.type || 'image/png',
    width: finalWidth,
    height: finalHeight,
    hasAlpha,
    anchor: role === 'stamp' ? { x: 0.5, y: 1.0 } : { x: 0.5, y: 0.5 },
    tags: tags.length ? tags : [role],
    role,
    dataUrl: finalDataUrl,
    createdAt: Date.now(),
  };

  await saveAsset(asset);
  return asset;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function checkImageHasAlpha(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(img.width, 100);
    canvas.height = Math.min(img.height, 100);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 250) return true;
    }
    return false;
  } catch {
    return true;
  }
}
