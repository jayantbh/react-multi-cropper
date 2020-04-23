import {
  Coordinates,
  CropperBoxDataMap,
  CropperProps,
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
import { fabric } from 'fabric';
const dpr = window.devicePixelRatio;
const imageDebounceTime = 500;

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
  image: any,
  canvasFab: any,
  canvasTar: any,
  rotation: any,
) => {
  if (!canvasTar || !image || !canvasFab) return;

  const ctx = canvasTar.getContext('2d');
  if (!ctx) return;
  const {
    height,
    width,
  } = canvasFab.getElement().getBoundingClientRect();
  canvasTar.height = height * dpr;
  canvasTar.width = width * dpr;
  const tx = image.translateX * dpr;
  const ty = image.translateY * dpr;
  const aspectRatio = image.width / image.height;
  ctx.fillRect(0, 0, canvasFab.width, canvasFab.height);
  ctx.translate(tx, ty);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-tx, -ty);
  ctx.drawImage(image.getElement(), 0, 0, height * dpr * aspectRatio, height * dpr);
  console.log('translate',image.translateX, image.translateY)
  ctx.resetTransform();
  // const iHeight = img.height;
  // const iWidth = img.width;
  // const { x: ix, y: iy } = getImgBoundingRect(
  //   img,
  //   staticPanCoords,
  //   activePanCoords
  // );

};
export const getCroppedImageFromBox = (
  image: any,
  canvas: any,
  rotation: any,
  boxes: any,
  staticPanCoords:any,
): any => {
  if (!canvas || !image) return {};
  const {
    height,
    width,
  } = canvas.getElement().getBoundingClientRect();
  const aspectRatio = image.width / image.height;

  // ctx.resetTransform();
  console.log(rotation);
  let map: any = {};
  canvas.getObjects().map((box: any) => {
    console.log('box', box.angle, box.left,box.top, image.left, image.top, box);
    if (box.width === 0 || box.height === 0) return;
    // const targetX = box.left;
    // const targetY = box.top;
    console.log('boxes',boxes);
    const boxRect = boxes.find((b:any) => b.id===box.id)
    let  angle  = boxRect ? boxRect.rotation : 0;
    let {angle:rotateAngle} = box;
    console.log('anlges',angle, rotateAngle)
    let tempCanvas = document.createElement('canvas');
    let ctx: any = tempCanvas.getContext('2d');
    tempCanvas.height = height*dpr;
    tempCanvas.width = width*dpr;
    let tx = image.translateX - staticPanCoords.x;
    let ty = image.translateY - staticPanCoords.y;
    // console.log(image);
    console.log('translate',staticPanCoords,tx, ty);
    ctx.fillRect(0, 0, width, height);
    const boxTopLeftX = image.translateX * dpr;
    const boxTopLeftY = image.translateY * dpr;
    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate(angle * Math.PI/ 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(image.getElement(), tx*dpr,ty*dpr,height * dpr * aspectRatio, height * dpr);

    // ctx.resetTransform();
    canvas.discardActiveObject();
    canvas.renderAll();
    let activeObject1 = new fabric.ActiveSelection([image, box], {

    });
    canvas.setActiveObject(activeObject1);
    if (activeObject1 != null) {
      activeObject1.rotate(-rotateAngle);

      canvas.discardActiveObject();
    }

    console.log('box', box.angle, box.left,box.top, image.left, image.top, box);
    const rotatedImageData = ctx.getImageData(
      box.left * dpr,
      box.top * dpr,
      box.width * dpr,
      box.height * dpr
    );
    let activeObject2 = new fabric.ActiveSelection([image, box], {

    });
    canvas.setActiveObject(activeObject2);
    if (activeObject2 != null) {
      activeObject2.rotate(rotateAngle);

      canvas.discardActiveObject();
    }
    canvas.renderAll();
    console.log('box', box.angle, box.left,box.top, image.left, image.top, box);
    const finalImageUrl = imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return;
    map = { ...map, [box.id]: finalImageUrl };
    return;
  }, {})
  return map
}
export const getPaintVariables = (
  img: any,
  canvas: any,
  // staticPanCoords: Coordinates,
  // activePanCoords: Coordinates,
  zoom: number
) => {
  const iHeight = img.height * zoom;
  const iWidth = img.width * zoom;

  if (!iWidth || !iHeight) return;

  // const { x: ix, y: iy } = getImgBoundingRect(
  //   img,
  //   staticPanCoords,
  //   activePanCoords,
  //   // zoom
  // );
  const { x: ix, y: iy } = img.getBoundingRect();

  // const {
  //   height: cHeight,
  //   width: cWidth,
  //   x: cx,
  //   y: cy,
  // } = cont.getBoundingClientRect();
  const chdpr = canvas.getHeight(); // ch = container height
  const cwdpr = canvas.getWidth(); // cw = container width
  const ihdpr = iHeight; // ih = image height
  const iwdpr = iWidth; //  iw = image width
  const xOff = ix;
  const yOff = iy;

  const imgRect = img.getBoundingClientRect();
  const conRect = canvas.getBoundingRect();
  const tx = (imgRect.right + imgRect.left) / 2 - conRect.left;
  const ty = (imgRect.bottom + imgRect.top) / 2 - conRect.top;

  return { chdpr, cwdpr, ihdpr, iwdpr, xOff, yOff, tx, ty };
};
export const getImageMapFromBoxes = (
  boxes: CropperProps['boxes'],
  cont: any | null,
  canvas: HTMLCanvasElement | null,

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

export const onImageResize = (
  img: HTMLImageElement | null,
  cont: HTMLDivElement | null,
  canvas: HTMLCanvasElement | null,
  prevSize: MutableRefObject<RefSize | undefined>,
  autoSizeTimeout: MutableRefObject<number>,
  setCenterCoords: Dispatch<SetStateAction<Coordinates>>,
  staticPanCoords: Coordinates,
  // activePanCoords: Coordinates,
  // rotation: number,
  src: CropperProps['src'],
  boxes: CropperProps['boxes'],
  onChange: CropperProps['onChange'],
  onCrop: CropperProps['onCrop']
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
  performCanvasPaint(
    img,
    cont,
    canvas,
    staticPanCoords,
    // activePanCoords,
    // rotation
  );
  onChange ?.({ type: 'auto-resize' }, undefined, undefined, newBoxes);
  clearTimeout(autoSizeTimeout.current);
  autoSizeTimeout.current = window.setTimeout(() => {
    onCrop ?.(
      { type: 'manual-resize' },
      getImageMapFromBoxes(newBoxes, cont, canvas),
      undefined
    );
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
  img: any,
  cont: HTMLDivElement | null,
  staticPanCoords: Coordinates,
  activePanCoords: Coordinates
): [Coordinates, Dispatch<SetStateAction<Coordinates>>] => {
  const [centerCoords, setCenterCoords] = useState<Coordinates>({ x: 0, y: 0 });
  console.log('inside center calc')
  useEffect(() => {
    if (!img || !cont) return;
    const imgRect = img.getBoundingRect();
    const conRect = cont.getBoundingClientRect();
    console.log('inside center calc', imgRect, conRect);
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
  getSelections: () => ReturnType<typeof getImageMapFromBoxes>
) => {
  const propSizeTimeout = useRef(-1);

  useEffect(() => {
    clearTimeout(propSizeTimeout.current);
    propSizeTimeout.current = window.setTimeout(() => {
      drawCanvas();
      onCrop ?.({ type: 'manual-resize' }, getSelections(), undefined);
    }, imageDebounceTime);
  }, [width, height]);
};

export const onImageLoad = (
  prevSize: MutableRefObject<RefSize | undefined>,
  lastUpdatedBox: MutableRefObject<RefSize | undefined>,
  onLoad: CropperProps['onLoad'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: () => ReturnType<typeof getImageMapFromBoxes>
): ReactEventHandler<HTMLImageElement> => (e) => {
  const img = e.currentTarget;
  if (!img) return;

  prevSize.current = {
    height: Math.round(img.height),
    width: Math.round(img.width),
  };
  lastUpdatedBox.current = undefined;

  drawCanvas();
  onLoad ?.(e, getSelections());
};

export const usePropRotation = (
  rotation: number,
  boxes: CropperProps['boxes'],
  onChange: CropperProps['onChange'],
  onCrop: CropperProps['onCrop'],
  drawCanvas: () => ReturnType<typeof performCanvasPaint>,
  getSelections: (
    boxes: CropperProps['boxes']
  ) => ReturnType<typeof getImageMapFromBoxes>
) => {
  const prevRotation = useRef(rotation);
  const rotationFrame = useRef(-1);
  const rotationTimeout = useRef(-1);

  useEffect(() => {
    cancelAnimationFrame(rotationFrame.current);
    rotationFrame.current = requestAnimationFrame(() => {
      const rotationDiff = rotation - prevRotation.current;
      const newBoxes = boxes.map((box) => ({
        ...box,
        rotation: box.rotation + rotationDiff,
      }));

      prevRotation.current = rotation;

      onChange ?.({ type: 'rotate' }, undefined, undefined, newBoxes);

      clearTimeout(rotationTimeout.current);
      rotationTimeout.current = window.setTimeout(() => {
        drawCanvas();
        onCrop ?.({ type: 'rotate' }, getSelections(newBoxes), undefined);
      }, imageDebounceTime);
    });
  }, [rotation]);
};
