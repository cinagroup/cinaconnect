/**
 * Image Optimization for Cinacoin Wallet Icons
 *
 * Lazy-loads wallet icons using IntersectionObserver and provides
 * a fallback for environments where the API is unavailable.
 */

/** Configuration for lazy image loading. */
export interface LazyImageConfig {
  /** Root margin for preloading (e.g., "50px 0px"). */
  rootMargin?: string;
  /** Threshold for visibility detection (0-1). */
  threshold?: number;
  /** Placeholder image data URI or CSS background. */
  placeholder?: string;
}

/** Default configuration for wallet icon lazy loading. */
const DEFAULT_CONFIG: Required<LazyImageConfig> = {
  rootMargin: '50px 0px',
  threshold: 0.01,
  placeholder: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Crect fill="%231E293B" width="40" height="40" rx="8"/%3E%3C/svg%3E',
};

/**
 * Lazy-load a single image element.
 *
 * @param img - The img element to lazy-load.
 * @param config - Lazy loading configuration.
 * @returns Promise that resolves when the image is loaded.
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  config: LazyImageConfig = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Set placeholder
  if (cfg.placeholder && !img.src) {
    img.src = cfg.placeholder;
  }

  // If no IntersectionObserver, load immediately (fallback)
  if (typeof IntersectionObserver === 'undefined') {
    return loadImage(img);
  }

  return new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              loadImage(img).finally(() => resolve());
            } else {
              resolve();
            }
            observer.disconnect();
          }
        }
      },
      {
        rootMargin: cfg.rootMargin,
        threshold: cfg.threshold,
      }
    );

    observer.observe(img);
  });
}

/**
 * Load an image and return a promise for when it's done.
 */
function loadImage(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
  });
}

/**
 * Lazy-load all wallet icons in a container.
 *
 * Scans for img elements with data-src attributes and sets up
 * IntersectionObserver-based lazy loading.
 *
 * @param container - The container element containing wallet icons.
 * @param config - Lazy loading configuration.
 * @returns Cleanup function to disconnect the observer.
 */
export function lazyLoadAllImages(
  container: HTMLElement,
  config: LazyImageConfig = {}
): () => void {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const images = container.querySelectorAll('img[data-src]');

  // If no IntersectionObserver, load immediately
  if (typeof IntersectionObserver === 'undefined') {
    images.forEach((img) => {
      const src = img.getAttribute('data-src');
      if (src) {
        (img as HTMLImageElement).src = src;
        img.removeAttribute('data-src');
      }
    });
    return () => {}; // No-op cleanup
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.getAttribute('data-src');
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.remove('ocx-lazy');
            img.classList.add('ocx-loaded');
          }
          observer.unobserve(img);
        }
      }
    },
    {
      rootMargin: cfg.rootMargin,
      threshold: cfg.threshold,
    }
  );

  images.forEach((img) => {
    // Set placeholder
    if (cfg.placeholder && !(img as HTMLImageElement).src) {
      (img as HTMLImageElement).src = cfg.placeholder;
    }
    img.classList.add('ocx-lazy');
    observer.observe(img);
  });

  return () => observer.disconnect();
}

/**
 * Create an optimized wallet icon element.
 *
 * Returns an img element configured for lazy loading with
 * proper alt text and sizing.
 *
 * @param iconUrl - URL of the wallet icon.
 * @param walletName - Wallet name for alt text.
 * @param size - Width/height in pixels.
 * @returns Configured img element.
 */
export function createWalletIcon(
  iconUrl: string,
  walletName: string,
  size: number = 40
): HTMLImageElement {
  const img = document.createElement('img');
  img.setAttribute('data-src', iconUrl);
  img.alt = walletName;
  img.width = size;
  img.height = size;
  img.style.borderRadius = 'var(--ocx-radius-md, 0.5rem)';
  img.style.objectFit = 'cover';
  img.loading = 'lazy';
  return img;
}
