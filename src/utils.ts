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

export const getImageDimensions = (image: any, container:any) => {
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
      imgBaseHeight = imgBaseWidth/imgAspectRatio;
    }
    return { height: imgBaseHeight, width: imgBaseWidth };
}
