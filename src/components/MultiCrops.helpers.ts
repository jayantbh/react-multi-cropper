import {
  getImageDimensions,
  getScrollPositions,
  fabricRectToCropperBox,
} from '../utils';

import { fabric } from 'fabric';

import {
  DependencyList,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { CropperProps } from '../types';

export const boxSaveTimerDuration = 50;
let boxSaveTimerId = -1;
export const boxSaveTimeout = (cb: Function) => {
  clearTimeout(boxSaveTimerId);
  // @ts-ignore
  boxSaveTimerId = setTimeout(cb, boxSaveTimerDuration);
};

// This implementation makes the snipped image quality be dependent on the canvas, and not the image.
export const getCroppedImageFromBox = (
  canvas: fabric.Canvas | null,
  box: fabric.Rect
) => {
  if (!canvas) return;
  const objects = canvas.getObjects();
  canvas.remove(...objects);

  const zoom = canvas.getZoom();
  const data = canvas.toDataURL({
    top: box.top,
    left: box.left,
    width: (box.width || 1) * zoom,
    height: (box.height || 1) * zoom,
  });

  canvas.add(...objects);
  canvas.requestRenderAll();
  return { [box.id]: data };
};

export const useScrollbars = (canvas?: any, image?: any): any => {
  if (!canvas || !image) return { wl: 0, wr: 0, ht: 0, hb: 0 };
  return getScrollPositions(canvas, image);
};

export function usePrevious<T>(value: T): T {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export const useFrame = (fn: (...args: any[]) => any) => {
  const frameRef = useRef(-1);

  return useCallback(
    (..._args: any[]) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => fn(..._args));
    },
    [fn]
  );
};

export const performRotation = (
  image: fabric.Image,
  canvas: fabric.Canvas,
  rotation: number,
  rotDiff: number = 0
) => {
  const { top: cy, left: cx } = canvas.getCenter();
  let center = new fabric.Point(cx, cy);
  let radians = fabric.util.degreesToRadians(rotDiff);

  if (image.angle !== rotation) {
    image.angle = rotation;
    let origin = new fabric.Point(image?.left || 0, image?.top || 0);
    let new_loc = fabric.util.rotatePoint(origin, center, radians);
    image.top = new_loc.y;
    image.left = new_loc.x;
    image.setCoords();
  }

  canvas.getObjects().forEach((obj) => {
    if (!obj?.left || !obj?.top) return;
    let origin = new fabric.Point(obj.left, obj.top);
    let new_loc = fabric.util.rotatePoint(origin, center, radians);
    obj.top = new_loc.y;
    obj.left = new_loc.x;
    obj.angle = (obj.angle || 0) + rotDiff; //rotate each object by the same angle
    obj.setCoords();
  });

  canvas.requestRenderAll();
};

export const useRotation = (
  src: string,
  image: fabric.Image,
  canvas: fabric.Canvas | null,
  rotation: number,
  rotationRef: MutableRefObject<number | undefined>,
  isReset: MutableRefObject<boolean | undefined>,
  onChange: CropperProps['onChange']
) => {
  const prevSrc = usePrevious(src);
  const rotFrame = useRef(-1);

  useEffect(() => {
    if (src !== prevSrc) return;
    if (!canvas || !image) return;
    if (isReset.current) {
      isReset.current = false;
      rotationRef.current = 0;
      return;
    }

    cancelAnimationFrame(rotFrame.current);
    rotFrame.current = requestAnimationFrame(() => {
      performRotation(
        image,
        canvas,
        rotation,
        rotation - (rotationRef.current || 0)
      );

      boxSaveTimeout(() => {
        onChange?.(
          { type: 'rotate' },
          undefined,
          undefined,
          canvas.getObjects().map(fabricRectToCropperBox)
        );
      });

      rotationRef.current = rotation;
    });
  }, [rotation, isReset.current, src, prevSrc]);
};

export const resetToCenter = (
  image: fabric.Image | null,
  canvas: fabric.Canvas | null,
  container: HTMLDivElement | null
) => {
  if (!image || !canvas) return;
  canvas.setDimensions({
    width: container?.offsetWidth || 1000,
    height: container?.offsetHeight || 1000,
  });
  let { x: x1, y: y1 } = image.getCenterPoint();
  let dimensions: any = getImageDimensions(image, canvas.getElement());
  let x = (canvas.getWidth() - dimensions.width) / 2;
  let y = (canvas.getHeight() - dimensions.height) / 2;

  image.set({ left: x, top: y });

  let { x: x2, y: y2 } = image.getCenterPoint();
  const diffX = x2 - x1;
  const diffY = y2 - y1;

  let anchor = new fabric.Point(x, y);

  canvas.getObjects().forEach((rect) => {
    if (!rect?.left || !rect?.top) return;

    const translateX = (rect.left || 0) + diffX;
    const translateY = (rect.top || 0) + diffY;
    rect.set({
      left: translateX,
      top: translateY,
    });

    let origin = new fabric.Point(rect.left, rect.top);
    let radians = fabric.util.degreesToRadians(-(image.angle || 0));
    let new_loc = fabric.util.rotatePoint(origin, anchor, radians);
    rect.set({
      left: new_loc.x,
      top: new_loc.y,
      angle: (rect?.angle || 0) - (image?.angle || 0),
    });

    rect.setCoords();
  });

  image.set({ angle: 0 });

  canvas.requestRenderAll();
};

export const useZoom = (
  image: fabric.Image,
  canvas: fabric.Canvas | null,
  zoom: number,
  setScrollPositions: Dispatch<SetStateAction<any>>
) => {
  useEffect(() => {
    if (!canvas || !image) return;

    const center = canvas.getCenter();
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
    [...canvas.getObjects()].forEach((r) => r.set('strokeWidth', 2 / zoom));
    setScrollPositions(useScrollbars(canvas, image));
  }, [zoom]);
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
