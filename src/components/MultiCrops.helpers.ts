import {
  imageDataToDataUrl,
  getCenterCoords,
  getImageDimensions,
  getScrollPositions,
} from '../utils';

import { fabric } from 'fabric';

const dpr = 2; // window.devicePixelRatio;

import {
  DependencyList,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
} from 'react';
import { Box } from './Box';
import { CropperCursorMode } from '../types';

export const performCanvasPaint = (
  image: fabric.Image,
  canvasFab: fabric.Canvas,
  canvasTar: HTMLCanvasElement | null,
  rotation: number
) => {
  if (!canvasTar || !image || !canvasFab) return;

  const ctx = canvasTar.getContext('2d');
  if (!ctx) return;
  const { height, width } = canvasFab.getElement().getBoundingClientRect();
  canvasTar.height = height * dpr;
  canvasTar.width = width * dpr;
  let imgValues = getCenterCoords(image);
  const tx = imgValues.translateX * dpr;
  const ty = imgValues.translateY * dpr;
  const aspectRatio = (image.width || 1) / (image.height || 1);
  ctx.fillRect(0, 0, canvasFab.width as number, canvasFab.height as number);
  ctx.translate(tx, ty);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-tx, -ty);
  ctx.drawImage(
    image.getElement(),
    0,
    0,
    height * dpr * aspectRatio,
    height * dpr
  );
  ctx.resetTransform();
};
export const getCroppedImageFromBox = (
  image: fabric.Image,
  canvas: fabric.Canvas | null,
  boxes: any[]
): any => {
  if (!canvas || !image) return {};
  const { height, width } = canvas.getElement().getBoundingClientRect();

  let imgValues = getCenterCoords(image);
  let map: any = {};
  boxes.map((box: typeof Box) => {
    if (box.width === 0 || box.height === 0) return;
    let { angle: rotateAngle = 0, initRotation = 0 } = box;
    let tempCanvas = document.createElement('canvas');
    let ctx: any = tempCanvas.getContext('2d');
    tempCanvas.height = height * dpr;
    tempCanvas.width = width * dpr;
    let { height: imageHeight, width: imageWidth } = getImageDimensions(
      image,
      canvas.getElement()
    );
    let tx = imgValues.translateX - imageWidth / 2;
    let ty = imgValues.translateY - imageHeight / 2;
    ctx.fillRect(0, 0, width, height);
    const boxTopLeftX = imgValues.translateX * dpr;
    const boxTopLeftY = imgValues.translateY * dpr;
    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate((initRotation * Math.PI) / 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(
      image.getElement(),
      tx * dpr,
      ty * dpr,
      imageWidth * dpr,
      imageHeight * dpr
    );
    let activeObject = canvas.getActiveObject();
    canvas.discardActiveObject();
    canvas.renderAll();
    let activeObject1: any = new fabric.ActiveSelection([image, box], {
      hasRotatingPoint: false,
    });
    canvas.setActiveObject(activeObject1);
    if (activeObject1 != null) {
      activeObject1.rotate(-rotateAngle);
    }
    let boxValues = getCenterCoords(box);
    const rotatedImageData = ctx.getImageData(
      (boxValues.translateX - box.getScaledWidth() / 2) * dpr,
      (boxValues.translateY - box.getScaledHeight() / 2) * dpr,
      box.getScaledWidth() * dpr,
      box.getScaledHeight() * dpr
    );
    canvas.setActiveObject(activeObject1);
    if (activeObject1 != null) {
      activeObject1.rotate(0);

      canvas.discardActiveObject();
    }
    if (activeObject) {
      canvas.setActiveObject(activeObject);
    }
    canvas.renderAll();
    const finalImageUrl = imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return;
    map = { ...map, [box.id]: finalImageUrl };
    return;
  }, {});
  return map;
};

export const useScrollbars = (canvas?: any, image?: any): any => {
  if (!canvas || !image) return { wl: 0, wr: 0, ht: 0, hb: 0 };
  return getScrollPositions(canvas, image);
};

export const useRotation = (
  image: fabric.Image,
  canvas: fabric.Canvas | null,
  container: any,
  rotation: number,
  rotationRef: MutableRefObject<number | undefined>,
  isReset: MutableRefObject<boolean | undefined>
) => {
  useEffect(() => {
    if (!canvas || !image) return;

    canvas.discardActiveObject();
    canvas.renderAll();
    let activeObject = new fabric.ActiveSelection(
      [image, ...canvas.getObjects()],
      {
        hasControls: false,
      }
    );
    canvas.setActiveObject(activeObject);
    if (activeObject != null) {
      activeObject.rotate(rotation - (rotationRef.current || 0));

      canvas.discardActiveObject();

      canvas.renderAll();
    }
    rotationRef.current = rotation;
    if (isReset.current) {
      resetToCenter(image, canvas, container);
      isReset.current = false;
    }
  }, [rotation, isReset.current]);
};

export const resetToCenter = (
  image: fabric.Image,
  canvas: fabric.Canvas,
  container: any
) => {
  canvas.setDimensions({
    width: container?.offsetWidth || 1000,
    height: container?.offsetHeight || 1000,
  });
  let imgValues = getCenterCoords(image);
  let dimensions: any = getImageDimensions(image, canvas.getElement());
  let x = (canvas.getWidth() - dimensions.width) / 2;
  let y = (canvas.getHeight() - dimensions.height) / 2;
  image.set({ left: x, top: y });
  let newImgValues = getCenterCoords(image);
  const diffx = -1 * (imgValues.translateX - newImgValues.translateX);
  const diffy = -1 * (imgValues.translateY - newImgValues.translateY);

  [...canvas.getObjects()].map((rect) => {
    const translateX = (rect.left || 0) + diffx;
    const translateY = (rect.top || 0) + diffy;
    rect.set({ left: translateX, top: translateY });
    rect.setCoords();
    return;
  });
  canvas.renderAll();
};

export const useCursor = (
  canvas: any,
  attachListeners: Function,
  detachListeners: Function,
  cursorMode: CropperCursorMode
) => {
  useEffect(() => {
    if (!canvas) return;

    if (cursorMode === 'select') {
      canvas.set({ selection: true });
    } else {
      canvas.set({ selection: false });
    }

    attachListeners();
    return () => detachListeners();
  }, [cursorMode]);
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
