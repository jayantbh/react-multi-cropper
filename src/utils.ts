import { fabric } from 'fabric';

export function update<T>(index: number, item: T, items: T[]): T[] {
  return [...items.slice(0, index), item, ...items.slice(index + 1)];
}

export function remove<T>(index: number, count: number, items: T[]): T[] {
  const _items = [...items];
  _items.splice(index, count);
  return _items;
}

export const oneLevelEquals = (o1: object = {}, o2: object = {}) => {
  const keys = Object.keys(o1);
  return (
    keys.length === Object.keys(o2).length &&
    Object.keys(o1).every((key) => o1[key] === o2[key])
  );
};

export const imageDataToDataUrl = (imageData: ImageData): string | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  console.log(imageData.width, imageData.height)
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
};
export const getCenterCoords = (image: fabric.Image) => {
  const matrix = image.calcTransformMatrix();
  const values = fabric.util.qrDecompose(matrix);
  return values;
}

export const getImageDimensions = (image: any, container: any) => {
  const imageRefHeight = image.height || 0;
  const imageRefWidth = image.width || 0;
  const containerRefHeight = container ?.offsetHeight || 0;
  const containerRefWidth = container ?.offsetWidth || 0;
  const contAspectRatio = containerRefWidth / containerRefHeight;
  const imgAspectRatio = imageRefWidth / imageRefHeight || 1;
  let imgBaseHeight, imgBaseWidth;
  if (contAspectRatio > imgAspectRatio) {
    imgBaseHeight = containerRefHeight;
    imgBaseWidth = (imgBaseHeight || 0) * imgAspectRatio;
  } else {
    imgBaseWidth = containerRefWidth;
    imgBaseHeight = imgBaseWidth / imgAspectRatio;
  }
  return { height: imgBaseHeight, width: imgBaseWidth };
}

export const getScrollPositions = (canvas: any, image: any) => {
  const canHeight = canvas.getHeight();
  const canWidth = canvas.getWidth();
  let zoom = canvas.getZoom();
  let { height: imageHeight, width: imageWidth } = getImageDimensions(image, canvas.getElement());
  let { translateX: centerX, translateY: centerY } = getCenterCoords(image);
  // setCenterCoords({x:centerX,y:centerY});
  const bottom = ((imageHeight / 2) - (canHeight - centerY)) * (zoom);
  const top = image.top * zoom + (imageHeight / 2) * (zoom - 1);
  const left = image.left * zoom + (imageWidth / 2) * (zoom - 1);
  const right = ((imageWidth / 2) - (canWidth - centerX)) * (zoom);
  console.log(bottom, top, left, right, zoom);
  const wr = 1 * (left / canWidth) * 100
  const wl = 1 * (right / canWidth) * 100;
  const hb = 1 * (top / canHeight) * 100;
  const ht = 1 * (bottom / canHeight) * 100;
  console.log('scroll pos', wl, wr, ht, hb);
  return zoom < 1 ? { wl: 0, wr: 0, ht: 0, hb: 0 } : { wl, wr, ht, hb };
}
