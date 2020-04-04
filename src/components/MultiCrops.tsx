import React, {
  FC,
  MouseEvent,
  ReactEventHandler,
  SyntheticEvent,
  useRef,
} from 'react';
import sid from 'shortid';
import useResizeObserver from 'use-resize-observer';
import type { DragEvent, ResizeEvent } from '@interactjs/types/types';

import Crop from './Crop';
import css from './MultiCrops.module.scss';
import { imageDataToDataUrl } from '../utils';

export type DataUrl = string;
export type Coordinates = { x?: number; y?: number };
export type CropperBoxId = string;

export type CropperBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  id: CropperBoxId;
};

export type CropperBoxDataMap = {
  [key in CropperBoxId]: DataUrl;
};

export type CurrentImg = {
  boxId: CropperBoxId;
  dataUrl: DataUrl;
};

export type CurrentImgParam = undefined | CurrentImg;

export type CropperEventType =
  | 'draw'
  | 'draw-end'
  | 'resize'
  | 'auto-resize'
  | 'drag'
  | 'delete';

export type CropperEvent = {
  type: CropperEventType;
  event?: ResizeEvent | MouseEvent<HTMLImageElement> | MouseEvent | DragEvent;
};

export type CropTriggerFunctionWithImageData = (
  e: CropperEvent,
  dataMap: CropperBoxDataMap,
  currentImg: CurrentImgParam
) => any;

export type UpdateFunction = (
  event: CropperEvent,
  box: CropperBox | undefined,
  index: number | undefined,
  boxes: CropperBox[]
) => any;

export type ImgOnLoadWithImageData = (
  e: SyntheticEvent<HTMLImageElement>,
  map: CropperBoxDataMap
) => any;

export type CropperProps = {
  src: string;
  width?: number | string;
  height?: number | string;
  boxes: CropperBox[];
  onChange?: UpdateFunction;
  onDelete?: UpdateFunction;
  onLoad?: ImgOnLoadWithImageData;
  onCrop?: CropTriggerFunctionWithImageData;
};

const blankCoords: Coordinates = { x: undefined, y: undefined };

interface RefSize {
  width: number;
  height: number;
}

const MultiCrops: FC<CropperProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pointA = useRef<Coordinates>(blankCoords);
  const id = useRef<string>(sid.generate());
  const drawingIndex = useRef(-1);
  const prevSize = useRef<RefSize | undefined>(undefined);
  const lastUpdatedBox = useRef<CropperBox | undefined>(undefined);
  const isDrawing = useRef<boolean>(false);

  const drawCanvas = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const dpr = window.devicePixelRatio;

    const img = imageRef.current;
    const { height, width } = img.getBoundingClientRect();
    const canvas = canvasRef.current;
    const hdpr = height * dpr;
    const wdpr = width * dpr;

    canvas.setAttribute('height', hdpr + '');
    canvas.setAttribute('width', wdpr + '');
    canvas.setAttribute('style', `height: ${height}px; width: ${width}px;`);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, wdpr, hdpr);
  };

  const getSelections = (): CropperBoxDataMap => {
    if (!canvasRef.current) return {};
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return {};

    return props.boxes.reduce<CropperBoxDataMap>((map, box) => {
      const { x, y, width, height } = box;
      if (width === 0 || height === 0) return map;
      const dpr = window.devicePixelRatio;

      const imageData = imageDataToDataUrl(
        ctx.getImageData(x * dpr, y * dpr, width * dpr, height * dpr)
      );

      if (!imageData) return map;

      return { ...map, [box.id]: imageData };
    }, {});
  };

  useResizeObserver({
    ref: imageRef,
    onResize: ({ width: _w, height: _h }: RefSize) => {
      const width = Math.round(_w),
        height = Math.round(_h);

      // If image elements don't exist
      // or image may not have been initialized (prevSize not set)
      // or image changed but props yet to update (ResizeObserver fired early)
      // or image dimensions have not changed
      // do nothing
      if (
        !imageRef.current ||
        !prevSize.current ||
        (imageRef.current && imageRef.current.src !== props.src) ||
        (prevSize.current.width === width && prevSize.current.height === height)
      )
        return;

      const hRatio = height / prevSize.current.height;
      const wRatio = width / prevSize.current.width;

      prevSize.current = { height, width };

      const boxes = props.boxes.map((box) => ({
        ...box,
        x: box.x * wRatio,
        y: box.y * hRatio,
        height: box.height * hRatio,
        width: box.width * wRatio,
      }));

      props.onChange?.({ type: 'auto-resize' }, undefined, undefined, boxes);

      drawCanvas();
    },
  });

  const onLoad: ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (!img) return;

    drawCanvas();

    const { height, width } = img.getBoundingClientRect();
    prevSize.current = { height: Math.round(height), width: Math.round(width) };
    lastUpdatedBox.current = undefined;
    props.onLoad?.(e, getSelections());
  };

  const getCursorPosition = (e: MouseEvent) => {
    if (!containerRef.current) return {};

    const { left, top } = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - left,
      y: e.clientY - top,
    };
  };

  const handleCrop = (e: CropperEvent['event'], type: CropperEvent['type']) => {
    const selections = getSelections();
    const boxId = lastUpdatedBox.current?.id;
    const currentImgParam: CurrentImgParam = boxId
      ? {
          boxId,
          dataUrl: selections[boxId],
        }
      : undefined;

    props.onCrop?.({ type, event: e }, getSelections(), currentImgParam);

    isDrawing.current = false;
  };

  const handleMouseDown = (e: MouseEvent) => {
    const isTargetInCropper =
      e.target === imageRef.current || e.target === containerRef.current;
    if (!isTargetInCropper) return;

    const { x, y } = getCursorPosition(e);

    drawingIndex.current = props.boxes.length;
    pointA.current = { x, y };
    id.current = sid.generate();
    isDrawing.current = true;
  };

  const handleMouseMove = (e: MouseEvent) => {
    const { onChange, boxes } = props;
    const pointB = getCursorPosition(e);

    if (pointA.current.x && pointA.current.y && pointB.x && pointB.y) {
      const box = {
        x: Math.min(pointA.current.x, pointB.x),
        y: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
        id: id.current,
      };
      const nextBoxes = [...boxes];
      nextBoxes[drawingIndex.current] = box;
      lastUpdatedBox.current = box;
      onChange?.(
        { type: 'draw', event: e },
        box,
        drawingIndex.current,
        nextBoxes
      );
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLImageElement>) => {
    if (!isDrawing) return;
    pointA.current = {};

    handleCrop(e, 'draw-end');
    isDrawing.current = false;
  };

  const onChange: CropperProps['onChange'] = (e, box, index, boxes) => {
    lastUpdatedBox.current = box;
    props.onChange?.(e, box, index, boxes);
  };

  return (
    <>
      <div
        className={css.container}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={containerRef}
      >
        <img
          ref={imageRef}
          src={props.src}
          width={props.width}
          height={props.height}
          onLoad={onLoad}
          alt='image to be cropped'
          draggable={false}
        />
        {props.boxes.map((box, index) => (
          <Crop
            key={box.id || index}
            {...props}
            index={index}
            box={box}
            onChange={onChange}
            onCrop={handleCrop}
          />
        ))}
      </div>
      <canvas ref={canvasRef} className={css.canvas} />
    </>
  );
};

export default MultiCrops;
