import {
  CanvasWorker,
  Coordinates,
  CropperBox,
  CropperBoxDataMap,
  CropperProps,
  CurrentImgParam,
  RefSize,
} from '../types';
import { imageDataToDataUrl } from '../utils';
import {
  Dispatch,
  MouseEvent,
  MutableRefObject,
  ReactEventHandler,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import createWorker from 'offscreen-canvas/create-worker';

// @ts-ignore -- file generated on `yarn start`
import CanvasWorkerModule from '../worker.bundle';

const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
const imageDebounceTime = 150;

const setTimeout =
  typeof window !== 'undefined' ? window.setTimeout : global.setTimeout;
const clearTimeout = (t: number | NodeJS.Timeout) =>
  typeof window !== 'undefined'
    ? window.clearTimeout(t as number)
    : global.clearTimeout(t as NodeJS.Timeout);

export const getImgBoundingRect = (
  img: HTMLImageElement,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates
): DOMRect => {
  const currStyle = img.style.transform;
  img.style.transform = `
      translate(
        ${staticPanCoords.x + activePanCoords.x}px,
        ${staticPanCoords.y + activePanCoords.y}px)
      rotate(0deg)`;
  const rect = img.getBoundingClientRect();
  img.style.transform = currStyle;
  return rect;
};

export const performCanvasPaint = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates,
  rotation: number
) => {
  if (!canvas || !img || !cont) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const iHeight = img.height;
  const iWidth = img.width;
  const { x: ix, y: iy } = getImgBoundingRect(
    img,
    staticPanCoords,
    activePanCoords
  );

  const {
    height: cHeight,
    width: cWidth,
    x: cx,
    y: cy,
  } = cont.getBoundingClientRect();
  const chdpr = cHeight * dpr; // ch = container height
  const cwdpr = cWidth * dpr; // cw = container width
  const ihdpr = iHeight * dpr; // ih = image height
  const iwdpr = iWidth * dpr; //  iw = image width
  const xOff = (ix - cx) * dpr;
  const yOff = (iy - cy) * dpr;

  canvas.setAttribute('height', chdpr + '');
  canvas.setAttribute('width', cwdpr + '');
  canvas.setAttribute(
    'style',
    `height: ${cHeight / 2}px; width: ${cWidth / 2}px;`
  );

  const imgRect = img.getBoundingClientRect();
  const conRect = cont.getBoundingClientRect();
  const tx = ((imgRect.right + imgRect.left) / 2 - conRect.left) * dpr;
  const ty = ((imgRect.bottom + imgRect.top) / 2 - conRect.top) * dpr;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(tx, ty);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-tx, -ty);
  ctx.drawImage(img, xOff, yOff, iwdpr, ihdpr);
  ctx.resetTransform();
};

const imgToImageData = (
  img: HTMLImageElement,
  height: number,
  width: number
) => {
  const canvas = document.createElement('canvas');
  canvas.height = height;
  canvas.width = width;
  canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
  return canvas.getContext('2d')?.getImageData(0, 0, width, height);
};

export const performOffscreenCanvasPaint = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  worker: CanvasWorker,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates,
  rotation: number
) => {
  if (!worker || !img || !cont) return;

  const iHeight = img.height;
  const iWidth = img.width;
  const { x: ix, y: iy } = getImgBoundingRect(
    img,
    staticPanCoords,
    activePanCoords
  );

  const {
    height: cHeight,
    width: cWidth,
    x: cx,
    y: cy,
  } = cont.getBoundingClientRect();
  const chdpr = cHeight * dpr; // ch = container height
  const cwdpr = cWidth * dpr; // cw = container width
  const ihdpr = iHeight * dpr; // ih = image height
  const iwdpr = iWidth * dpr; //  iw = image width
  const xOff = (ix - cx) * dpr;
  const yOff = (iy - cy) * dpr;

  const imgRect = img.getBoundingClientRect();
  const conRect = cont.getBoundingClientRect();
  const tx = ((imgRect.right + imgRect.left) / 2 - conRect.left) * dpr;
  const ty = ((imgRect.bottom + imgRect.top) / 2 - conRect.top) * dpr;

  const imageData = imgToImageData(img, ihdpr, iwdpr);

  worker.post({
    update: {
      chdpr,
      cwdpr,
      tx,
      ty,
      xOff,
      yOff,
      iwdpr,
      ihdpr,
      src: img.src,
      rotation,
      imageData,
    },
  });
};

export const getImageMapFromBoxes = (
  boxes: CropperProps['boxes'],
  cont: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null
): CropperBoxDataMap => {
  if (!cont || !canvas) return {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};

  const contRect = cont.getBoundingClientRect();

  return boxes.reduce<CropperBoxDataMap>((map, box) => {
    if (box.width === 0 || box.height === 0) return map;

    const { height, width } = canvas;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    tempCanvas.height = height * 3;
    tempCanvas.width = width * 3;

    const boxTopLeftEl = document
      .getElementById(box.id)
      ?.querySelector('.rmc__crop__corner-element__top-left');
    if (!boxTopLeftEl || !ctx) return map;

    const btlRect = boxTopLeftEl.getBoundingClientRect();
    const targetX = btlRect.x - contRect.x;
    const targetY = btlRect.y - contRect.y;
    const boxTopLeftX = targetX * dpr + width;
    const boxTopLeftY = targetY * dpr + height;

    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate((-box.rotation * Math.PI) / 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(canvas, width, height);

    const rotatedImageData = ctx.getImageData(
      boxTopLeftX,
      boxTopLeftY,
      box.width * dpr,
      box.height * dpr
    );

    const finalImageUrl = imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return map;

    return { ...map, [box.id]: finalImageUrl };
  }, {});
};

export const getOffscreenImageMapFromBoxes = (
  boxes: CropperProps['boxes'],
  cont: HTMLDivElement | null,
  worker: CanvasWorker
): CropperBoxDataMap => {
  if (!cont || !worker) return {};
  const contRect = cont.getBoundingClientRect();

  const boxesForOfc = boxes.map((box) => {
    if (box.width === 0 || box.height === 0) return {};

    const boxTopLeftEl = document
      .getElementById(box.id)
      ?.querySelector('.rmc__crop__corner-element__top-left');
    if (!boxTopLeftEl) return;

    const btlRect = boxTopLeftEl.getBoundingClientRect();

    return {
      ...box,
      dpr,
      btlRect,
      contRect,
    };
  });

  worker.post({
    retrieve: boxesForOfc,
  });

  return {};
};

export const onImageResize = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  prevSize: MutableRefObject<RefSize | undefined>,
  autoSizeTimeout: MutableRefObject<number | NodeJS.Timeout>,
  setCenterCoords: Dispatch<SetStateAction<Coordinates>>,
  src: CropperProps['src'],
  boxes: CropperProps['boxes'],
  onChange: CropperProps['onChange'],
  onCrop: CropperProps['onCrop'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: (
    boxes: CropperProps['boxes']
  ) => ReturnType<typeof getImageMapFromBoxes>,
  modifiable: CropperProps['modifiable'] = true
) => ({ width: _w, height: _h }: RefSize) => {
  const width = Math.round(_w);
  const height = Math.round(_h);

  if (
    !cont ||
    !img ||
    !prevSize.current ||
    img.getAttribute('src') !== src ||
    (prevSize.current.width === width && prevSize.current.height === height)
  )
    return;

  const hRatio = height / prevSize.current.height;
  const wRatio = width / prevSize.current.width;

  prevSize.current = { height, width };

  const newBoxes = boxes.map((box) => ({
    ...box,
    x: box.x * wRatio,
    y: box.y * hRatio,
    height: box.height * hRatio,
    width: box.width * wRatio,
  }));

  const imgRect = img.getBoundingClientRect();
  const contRect = cont.getBoundingClientRect();
  setCenterCoords({
    x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
    y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
  });
  onChange?.({ type: 'auto-resize' }, undefined, undefined, newBoxes);

  if (!modifiable) return;
  drawCanvas();
  clearTimeout(autoSizeTimeout.current);
  autoSizeTimeout.current = setTimeout(() => {
    onCrop?.({ type: 'auto-resize' }, getSelections(newBoxes), undefined);
  }, imageDebounceTime);
};

export const getCursorPosition = (
  e: MouseEvent,
  cont: HTMLDivElement | null,
  centerCoords: Coordinates
) => {
  if (!cont) return {};

  const { left, top } = cont.getBoundingClientRect();
  return {
    x: e.clientX - left - centerCoords.x,
    y: e.clientY - top - centerCoords.y,
  };
};

export const getAbsoluteCursorPosition = (e: MouseEvent) => ({
  x: e.clientX,
  y: e.clientY,
});

export const useCentering = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates
): [Coordinates, Dispatch<SetStateAction<Coordinates>>] => {
  const [centerCoords, setCenterCoords] = useState<Coordinates>({ x: 0, y: 0 });

  useEffect(() => {
    if (!img || !cont) return;

    const imgRect = img.getBoundingClientRect();
    const conRect = cont.getBoundingClientRect();
    const x = (imgRect.right + imgRect.left) / 2 - conRect.left;
    const y = (imgRect.bottom + imgRect.top) / 2 - conRect.top;

    setCenterCoords({ x, y });
  }, [img, cont, staticPanCoords, activePanCoords]);

  return [centerCoords, setCenterCoords];
};

export const usePropResize = (
  width: CropperProps['width'],
  height: CropperProps['height'],
  onCrop: CropperProps['onCrop'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: () => ReturnType<typeof getImageMapFromBoxes>,
  modifiable: CropperProps['modifiable'] = true
) => {
  if (!modifiable) return;
  const propSizeTimeout = useRef<number | NodeJS.Timeout>(-1);

  useEffect(() => {
    clearTimeout(propSizeTimeout.current);
    propSizeTimeout.current = setTimeout(() => {
      drawCanvas();
      onCrop?.({ type: 'manual-resize' }, getSelections(), undefined);
    }, imageDebounceTime);
  }, [width, height]);
};

export const onImageLoad = (
  prevSize: MutableRefObject<RefSize | undefined>,
  lastUpdatedBox: MutableRefObject<RefSize | undefined>,
  onLoad: CropperProps['onLoad'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: () => ReturnType<typeof getImageMapFromBoxes>,
  cont: HTMLDivElement | null,
  setCenterCoords: Dispatch<SetStateAction<Coordinates>>
): ReactEventHandler<HTMLImageElement> => (e) => {
  const img = e.currentTarget;
  if (!img || !cont) return;

  prevSize.current = {
    height: Math.round(img.height),
    width: Math.round(img.width),
  };
  lastUpdatedBox.current = undefined;

  const imgRect = img.getBoundingClientRect();
  const contRect = cont.getBoundingClientRect();
  setCenterCoords({
    x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
    y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
  });

  requestAnimationFrame(() => {
    drawCanvas();
    onLoad?.(e, getSelections());
  });
};

export const usePropRotation = (
  rotation: number,
  boxes: CropperProps['boxes'],
  onChange: CropperProps['onChange'],
  onCrop: CropperProps['onCrop'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: (
    boxes: CropperProps['boxes']
  ) => ReturnType<typeof getImageMapFromBoxes>,
  srcChanged: boolean,
  modifiable: CropperProps['modifiable'] = true
) => {
  const prevRotation = useRef(rotation);
  const rotationTimeout = useRef<number | NodeJS.Timeout>(-1);

  useEffect(() => {
    if (srcChanged) return;

    const rotationDiff = rotation - prevRotation.current;
    const newBoxes = boxes.map((box) => ({
      ...box,
      rotation: box.rotation + rotationDiff,
    }));

    prevRotation.current = rotation;

    onChange?.({ type: 'rotate' }, undefined, undefined, newBoxes);

    if (!modifiable) return;

    clearTimeout(rotationTimeout.current);
    rotationTimeout.current = setTimeout(() => {
      drawCanvas();
      onCrop?.({ type: 'rotate' }, getSelections(newBoxes), undefined);
    }, imageDebounceTime);
  }, [rotation]);
};

export const useWorker = (
  workerRef: MutableRefObject<CanvasWorker>,
  canvas: HTMLCanvasElement | null,
  hasOCSupport: boolean,
  onCrop: CropperProps['onCrop'],
  lastUpdatedBox: MutableRefObject<CropperBox | undefined>
) => {
  useEffect(() => {
    if (!canvas || !hasOCSupport || workerRef.current) return;
    workerRef.current = createWorker(canvas, CanvasWorkerModule, (e) => {
      if (e.data.imageMap) {
        const boxId = lastUpdatedBox.current?.id;
        const currentImgParam: CurrentImgParam = boxId
          ? {
              boxId,
              dataUrl: e.data.imageMap[boxId],
            }
          : undefined;

        onCrop?.(
          { type: 'draw-end' },
          e.data.imageMap as CropperBoxDataMap,
          currentImgParam
        );
      }
    });
  }, [hasOCSupport, lastUpdatedBox.current]);
};
