import {
  CanvasWorker,
  CartesianSize,
  Coordinates,
  CropperBox,
  CropperBoxDataMap,
  CropperEventType,
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
  activePanCoords: Coordinates,
  zoom: number
): DOMRect => {
  const currStyle = img.style.transform;
  img.style.transform = `
      translate(
        ${staticPanCoords.x + activePanCoords.x}px,
        ${staticPanCoords.y + activePanCoords.y}px)
      rotate(0deg)
      scale(${zoom})
      `;
  const rect = img.getBoundingClientRect();
  img.style.transform = currStyle;
  return rect;
};

const getPaintVariables = (
  img: HTMLImageElement,
  cont: HTMLDivElement,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates,
  zoom: number
) => {
  const iHeight = img.height * zoom;
  const iWidth = img.width * zoom;

  if (!iWidth || !iHeight) return;

  const { x: ix, y: iy } = getImgBoundingRect(
    img,
    staticPanCoords,
    activePanCoords,
    zoom
  );

  const {
    height: cHeight,
    width: cWidth,
    x: cx,
    y: cy,
  } = cont.getBoundingClientRect();
  const chdpr = cHeight; // ch = container height
  const cwdpr = cWidth; // cw = container width
  const ihdpr = iHeight; // ih = image height
  const iwdpr = iWidth; //  iw = image width
  const xOff = ix - cx;
  const yOff = iy - cy;

  const imgRect = img.getBoundingClientRect();
  const conRect = cont.getBoundingClientRect();
  const tx = (imgRect.right + imgRect.left) / 2 - conRect.left;
  const ty = (imgRect.bottom + imgRect.top) / 2 - conRect.top;

  return { chdpr, cwdpr, ihdpr, iwdpr, xOff, yOff, tx, ty };
};

export const performCanvasPaint = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates,
  rotation: number,
  zoom: number,
  imgScale: CartesianSize
) => {
  if (!canvas || !img || !cont) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const paintVariables = getPaintVariables(
    img,
    cont,
    staticPanCoords,
    activePanCoords,
    zoom
  );
  if (!paintVariables) return;
  const { chdpr, cwdpr, ihdpr, iwdpr, xOff, yOff, tx, ty } = paintVariables;

  canvas.setAttribute('height', chdpr * imgScale.y + '');
  canvas.setAttribute('width', cwdpr * imgScale.x + '');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(tx * imgScale.x, ty * imgScale.y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-tx * imgScale.x, -ty * imgScale.y);
  ctx.drawImage(
    img,
    xOff * imgScale.x,
    yOff * imgScale.y,
    iwdpr * imgScale.x,
    ihdpr * imgScale.y
  );
  ctx.resetTransform();
};

const imgToBitmap = (
  img: HTMLImageElement,
  height: number,
  width: number,
  imgScale: CartesianSize
) => {
  const canvas = new OffscreenCanvas(width * imgScale.x, height * imgScale.y);
  canvas
    .getContext('2d')
    ?.drawImage(img, 0, 0, width * imgScale.x, height * imgScale.y);
  return canvas.transferToImageBitmap();
};

export const performOffscreenCanvasPaint = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  worker: CanvasWorker,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates,
  rotation: number,
  zoom: number,
  imgScale: CartesianSize
) => {
  console.log(imgScale);
  if (!worker || !img || !cont) return;

  const paintVariables = getPaintVariables(
    img,
    cont,
    staticPanCoords,
    activePanCoords,
    zoom
  );
  if (!paintVariables) return;
  const { chdpr, cwdpr, ihdpr, iwdpr, xOff, yOff, tx, ty } = paintVariables;

  const bitmap = imgToBitmap(img, ihdpr, iwdpr, imgScale);

  worker.post(
    {
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
        bitmap,
        imgScale,
      },
    },
    [bitmap]
  );
};

export const getImageMapFromBoxes = (
  boxes: CropperProps['boxes'],
  cont: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null,
  imgScale: CartesianSize
): CropperBoxDataMap => {
  console.log(imgScale);
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
    const boxTopLeftX = targetX * imgScale.x + width;
    const boxTopLeftY = targetY * imgScale.y + height;

    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate((-box.rotation * Math.PI) / 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(canvas, width, height);

    const rotatedImageData = ctx.getImageData(
      boxTopLeftX,
      boxTopLeftY,
      box.width * imgScale.x,
      box.height * imgScale.y
    );

    const finalImageUrl = imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return map;

    return { ...map, [box.id]: finalImageUrl };
  }, {});
};

export const getOffscreenImageMapFromBoxes = (
  boxes: CropperProps['boxes'],
  cont: HTMLDivElement | null,
  worker: CanvasWorker,
  eventType: CropperEventType = 'draw-end',
  imgScale: CartesianSize
): CropperBoxDataMap => {
  console.log(imgScale);
  if (!cont || !worker) return {};
  const contRect = cont.getBoundingClientRect();

  const boxesForOfc = boxes
    .map((box) => {
      if (box.width === 0 || box.height === 0) return;

      const boxTopLeftEl = document
        .getElementById(box.id)
        ?.querySelector('.rmc__crop__corner-element__top-left');
      if (!boxTopLeftEl) return;

      const btlRect = boxTopLeftEl.getBoundingClientRect();

      return {
        ...box,
        btlRect,
        contRect,
      };
    })
    .filter((_) => _);

  worker.post({
    retrieve: {
      boxesForOfc,
      eventType,
      imgScale,
    },
  });

  return {};
};

export const useZoom = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
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
  modifiable: CropperProps['modifiable'] = true,
  rotation: number,
  imgBaseWidth: number,
  imgBaseHeight: number,
  zoom: number
) => {
  const prevRotation = usePrevious(rotation);
  const prevSrc = usePrevious(src);
  const prevSize = usePrevious({
    width: Math.round(imgBaseWidth * zoom),
    height: Math.round(imgBaseHeight * zoom),
  });

  useEffect(() => {
    const width = Math.round(imgBaseWidth * zoom);
    const height = Math.round(imgBaseHeight * zoom);
    const rotationDiff = rotation - prevRotation;

    if (width === 0 || height === 0) return;

    const imageDidNotChange =
      prevSize.width === width && prevSize.height === height;

    if (
      !cont ||
      !img ||
      img.getAttribute('src') !== src ||
      imageDidNotChange ||
      src !== prevSrc
    )
      return;
    const hRatio = height / prevSize.height;
    const wRatio = width / prevSize.width;

    const newBoxes = boxes.map((box) => ({
      ...box,
      x: box.x * wRatio,
      y: box.y * hRatio,
      height: box.height * hRatio,
      width: box.width * wRatio,
      rotation: box.rotation + rotationDiff,
    }));

    const imgRect = img.getBoundingClientRect();
    const contRect = cont.getBoundingClientRect();
    setCenterCoords({
      x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
      y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
    });
    onChange?.({ type: 'zoom' }, undefined, undefined, newBoxes);

    if (!modifiable) return;
    drawCanvas();
    clearTimeout(autoSizeTimeout.current);
    autoSizeTimeout.current = setTimeout(() => {
      onCrop?.({ type: 'zoom' }, getSelections(newBoxes), undefined);
    }, imageDebounceTime);
  }, [zoom]);
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
  width: number,
  height: number,
  onCrop: CropperProps['onCrop'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: (
    boxes?: CropperProps['boxes'],
    eventType?: CropperEventType
  ) => ReturnType<typeof getImageMapFromBoxes>,
  modifiable: CropperProps['modifiable'] = true
) => {
  if (!modifiable || !height || !width) return;
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
  lastUpdatedBox: MutableRefObject<RefSize | undefined>,
  onLoad: CropperProps['onLoad'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: (
    boxes?: CropperProps['boxes'],
    eventType?: CropperEventType
  ) => ReturnType<typeof getImageMapFromBoxes>,
  cont: HTMLDivElement | null,
  setCenterCoords: Dispatch<SetStateAction<Coordinates>>,
  setStaticPanCoords: Dispatch<SetStateAction<Coordinates>>,
  getUpdatedDimensions: (doStateUpdate?: boolean) => any
): ReactEventHandler<HTMLImageElement> => (e) => {
  const img = e.currentTarget;
  if (!img || !cont) return;

  lastUpdatedBox.current = undefined;

  const imgRect = img.getBoundingClientRect();
  const contRect = cont.getBoundingClientRect();
  setCenterCoords({
    x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
    y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
  });

  requestAnimationFrame(() => {
    drawCanvas();
    onLoad?.(getSelections(undefined, 'load'), () => {
      getUpdatedDimensions();
      setCenterCoords({
        x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
        y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
      });
      setStaticPanCoords({ x: 0, y: 0 });
    });
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
    if (srcChanged) {
      prevRotation.current = rotation;
      return;
    }

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
          { type: e.data.eventType },
          e.data.imageMap as CropperBoxDataMap,
          currentImgParam
        );
      }
    });
  }, [hasOCSupport, lastUpdatedBox.current]);
};

export function usePrevious<T>(value: T): T {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
