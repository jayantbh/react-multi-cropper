import { CropperBox, CropperProps } from './types';
import sid from 'shortid';

export function update<T>(index: number, item: T, items: T[]): T[] {
  return [...items.slice(0, index), item, ...items.slice(index + 1)];
}

export function remove<T>(index: number, count: number, items: T[]): T[] {
  const _items = [...items];
  _items.splice(index, count);
  return _items;
}

const isObj = (o: any) => o?.constructor === Object;

export const oneLevelEquals = (o1: object = {}, o2: object = {}) => {
  const keys = Object.keys(o1);
  return (
    keys.length === Object.keys(o2).length &&
    Object.keys(o1).every((key) => o1[key] === o2[key])
  );
};

export const deepEquals = (o1: object = {}, o2: object = {}): boolean => {
  const keys = Object.keys(o1);
  return (
    keys.length === Object.keys(o2).length &&
    Object.keys(o1).every((key) => {
      if (isObj(o1[key]) && isObj(o2[key])) return deepEquals(o1[key], o2[key]);
      return o1[key] === o2[key];
    })
  );
};

export const imageDataToDataUrl = (imageData: ImageData): string | null => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL();
};

export const getAbsoluteDetectedBoxes = (
  parent: CropperBox,
  children: Array<[number, number, number, number]>
): CropperBox[] => {
  const { x, y, rotation } = parent;
  return children.map((child) => {
    const [top, left, width, height] = child;
    return {
      x: top + x,
      y: left + y,
      width,
      height,
      rotation,
      id: sid.generate(),
    };
  });
};

export const isInView = (
  containerRect: ClientRect | undefined,
  boxRect: ClientRect | undefined
): boolean => {
  if (containerRect && boxRect) {
    if (
      boxRect.top > containerRect.top &&
      boxRect.left > containerRect.left &&
      boxRect.bottom < containerRect.bottom &&
      boxRect.right < containerRect.right
    ) {
      return true;
    }
  }
  return false;
};

export const scaleBoxes = (boxes: CropperProps['boxes'], scale: number) => {
  if (scale === 1) return boxes;

  return boxes.map((box) => ({
    ...box,
    x: box.x * scale,
    y: box.y * scale,
    height: box.height * scale,
    width: box.width * scale,
  }));
};
