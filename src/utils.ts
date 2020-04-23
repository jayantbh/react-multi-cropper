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
