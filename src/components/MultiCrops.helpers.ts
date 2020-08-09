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
  DependencyList,
  Dispatch,
  MouseEvent,
  MutableRefObject,
  ReactEventHandler,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import createWorker from 'offscreen-canvas/create-worker';

// @ts-ignore -- file generated on `yarn start`
import CanvasWorkerModule from '../worker.bundle';

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
  if (!cont || !canvas) return {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return {};

  const contRect = cont.getBoundingClientRect();

  return boxes.reduce<CropperBoxDataMap>((map, box) => {
    if (box.width === 0 || box.height === 0 || box.noImage) return map;

    const { height, width } = canvas;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    tempCanvas.height = height * 3;
    tempCanvas.width = width * 3;

    const boxTopLeftEl = document.getElementById(
      `rmc__crop__corner-element__top-left__${box.id}`
    );
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
  if (!cont || !worker) return {};
  const contRect = cont.getBoundingClientRect();

  const boxesForOfc = boxes
    .map((box) => {
      const { style, labelStyle, ...prunedBox } = box;
      if (box.width === 0 || box.height === 0 || box.noImage) return;

      const boxTopLeftEl = document.getElementById(
        `rmc__crop__corner-element__top-left__${box.id}`
      );
      if (!boxTopLeftEl) return;

      const btlRect = boxTopLeftEl.getBoundingClientRect();
      return {
        ...prunedBox,
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

export const useCenteringCallback = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates
): [Coordinates, (coords?: Coordinates) => void] => {
  const [centerCoords, setCenterCoords] = useState<Coordinates>({ x: 0, y: 0 });

  const refreshCenter = useCallback(
    (coords?: Coordinates) => {
      if (!img || !cont) return;

      if (coords) {
        setCenterCoords(coords);
      } else {
        const imgRect = img.getBoundingClientRect();
        const conRect = cont.getBoundingClientRect();
        const x = (imgRect.right + imgRect.left) / 2 - conRect.left;
        const y = (imgRect.bottom + imgRect.top) / 2 - conRect.top;

        setCenterCoords({ x, y });
      }
    },
    [img, cont, staticPanCoords, activePanCoords]
  );

  return [centerCoords, refreshCenter];
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
  setCenterCoords: (c?: Coordinates) => void,
  setStaticPanCoords: Dispatch<SetStateAction<Coordinates>>,
  getUpdatedDimensions: (args: {
    doStateUpdate?: boolean;
    eventType: CropperEventType;
  }) => any
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
      getUpdatedDimensions({ doStateUpdate: true, eventType: 'load' });
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
  srcChanged: boolean
) => {
  const prevRotation = useRef(rotation);
  const rotationFrame = useRef(-1);

  useEffect(() => {
    if (srcChanged) {
      prevRotation.current = rotation;
      return;
    }

    cancelAnimationFrame(rotationFrame.current);
    rotationFrame.current = requestAnimationFrame(() => {
      const rotationDiff = rotation - prevRotation.current;
      const newBoxes = boxes.map((box) => ({
        ...box,
        rotation: box.rotation + rotationDiff,
      }));

      prevRotation.current = rotation;

      onChange?.({ type: 'rotate' }, undefined, undefined, newBoxes);
    });
  }, [rotation]);
};

export const useWorker = (
  workerRef: MutableRefObject<CanvasWorker>,
  canvas: HTMLCanvasElement | null,
  hasOCSupport: boolean,
  onCrop: CropperProps['onCrop'],
  lastUpdatedBox: MutableRefObject<CropperBox | undefined>
) => {
  const cropHandlerRef = useRef(onCrop);
  cropHandlerRef.current = onCrop;
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

        cropHandlerRef.current?.(
          { type: e.data.eventType },
          e.data.imageMap as CropperBoxDataMap,
          currentImgParam
        );
      }
    });
  }, [hasOCSupport, lastUpdatedBox.current, onCrop]);
};

export function usePrevious<T>(value: T): T {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useScrollbars = (
  cont?: HTMLDivElement | null,
  img?: HTMLImageElement | null
) => {
  if (!cont || !img)
    return { wl: 0, wr: 0, ht: 0, hb: 0, pxScaleW: 1, pxScaleH: 1 };

  const cRect = cont.getBoundingClientRect();
  const iRect = img.getBoundingClientRect();

  const resultantBoundsWL = cRect.right - iRect.left;
  const resultantBoundsWR = iRect.right - cRect.left;
  const resultantBoundsHT = cRect.bottom - iRect.top;
  const resultantBoundsHB = iRect.bottom - cRect.top;

  const wlExcess = Math.max(resultantBoundsWL / cRect.width - 1, 0);
  const wrExcess = Math.max(resultantBoundsWR / cRect.width - 1, 0);
  const htExcess = Math.max(resultantBoundsHT / cRect.height - 1, 0);
  const hbExcess = Math.max(resultantBoundsHB / cRect.height - 1, 0);

  const wl = (wlExcess / (wlExcess + wrExcess + 1)) * 100;
  const wr = (wrExcess / (wlExcess + wrExcess + 1)) * 100;
  const ht = (htExcess / (htExcess + hbExcess + 1)) * 100;
  const hb = (hbExcess / (htExcess + hbExcess + 1)) * 100;

  const _pxScaleW = 100 / (100 - wl + wr);
  const _pxScaleH = 100 / (100 - hb + ht);
  const pxScaleW = Number.isFinite(_pxScaleW) ? _pxScaleW : 0;
  const pxScaleH = Number.isFinite(_pxScaleH) ? _pxScaleH : 0;

  return { wl, wr, ht, hb, pxScaleW, pxScaleH };
};

export const useWheelEvent = (
  cont: MutableRefObject<HTMLDivElement | null>,
  listener: EventListener,
  deps: DependencyList
) => {
  useEffect(() => {
    if (!cont.current) return;
    cont.current.addEventListener('wheel', listener);

    return () => {
      if (!cont.current) return;
      cont.current.removeEventListener('wheel', listener);
    };
  }, deps);
};
