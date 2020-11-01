import { v4 as uuid } from 'uuid';

import { fabric } from 'fabric';
import { CropperBox } from './types';
import { Box, BoxType } from './components/Box';

export const imageDataToDataUrl = (imageData: ImageData): string | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
};
export const getCenterCoords = (image: any) => {
  const matrix = image.calcTransformMatrix();
  const values = fabric.util.qrDecompose(matrix);
  return values;
};

export const getImageDimensions = (
  image: fabric.Image,
  container: HTMLCanvasElement
) => {
  const imageRefHeight = image.height || 0;
  const imageRefWidth = image.width || 0;
  const containerRefHeight = container?.offsetHeight || 0;
  const containerRefWidth = container?.offsetWidth || 0;
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
};

export const getScrollPositions = (
  canvas: fabric.Canvas,
  image: fabric.Image
) => {
  const canHeight = canvas.getHeight();
  const canWidth = canvas.getWidth();
  let zoom = canvas.getZoom();
  let { height: imageHeight, width: imageWidth } = getImageDimensions(
    image,
    canvas.getElement()
  );
  const bottom = Math.max(
    ((image.top || 0) + imageHeight) * zoom - canHeight,
    0
  );
  const top = Math.max(-(image.top || 0) * zoom, 0);
  const right = Math.max(((image.left || 0) + imageWidth) * zoom - canWidth, 0);
  const left = Math.max(-(image.left || 0) * zoom, 0);
  const wr = (right / (imageWidth * zoom * 2)) * 100;
  const wl = (left / (imageWidth * zoom * 2)) * 100;
  const hb = (bottom / (imageHeight * zoom * 2)) * 100;
  const ht = (top / (imageHeight * zoom * 2)) * 100;
  return zoom < 1 ? { wl: 0, wr: 0, ht: 0, hb: 0 } : { wl, wr, ht, hb };
};

export const fabricRectToCropperBox = (
  rect: BoxType & fabric.Object & typeof Box
): CropperBox => ({
  id: rect.id,
  width: rect.width,
  height: rect.height,
  angle: rect.angle,
  left: rect.left,
  top: rect.top,
  style: rect.style,
  meta: rect.meta,
  noImage: rect.noImage,
  showCross: rect.showCross,
  layer: rect.layer,
});

export const getAbsoluteDetectedBoxes = (
  parent: CropperBox,
  children: Array<[number, number, number, number]>
): CropperBox[] => {
  const { top: tx, left: lx, angle } = parent;
  return children.map((child) => {
    const [top, left, width, height] = child;
    return {
      left: left + lx,
      top: top + tx,
      width,
      height,
      angle,
      id: uuid(),
    };
  });
};
