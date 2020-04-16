import { default as ROPolyfill } from 'resize-observer-polyfill';

if (typeof window !== 'undefined') {
  window.ResizeObserver = window.ResizeObserver || ROPolyfill;

  if (!window.OffscreenCanvas) {
    window.OffscreenCanvas = class OffscreenCanvas {
      constructor(width, height) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;

        this.canvas.transferToImageBitmap = () => {
          const ctx = this.canvas.getContext('2d');
          if (!ctx) return;
          return ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        };
        this.canvas.convertToBlob = () => {
          return new Promise((resolve) => {
            this.canvas.toBlob(resolve);
          });
        };

        return this.canvas;
      }
    };
  }
}
