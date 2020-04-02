import React, {
  FC,
  MouseEvent,
  ReactEventHandler,
  SyntheticEvent,
  useRef,
} from 'react';
import sid from 'shortid';
import useResizeObserver from 'use-resize-observer';
import type { ResizeEvent } from '@interactjs/types/types';

import Crop from './Crop';
import css from './MultiCrops.module.scss';
import { imageDataToDataUrl } from '../utils';

export type DataUrl = string;
export type Coordinates = { x?: number; y?: number };
export type AnyFunction = (...a: any[]) => any;
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

export type CropTriggerFunctionWithImageData = (
  e: ResizeEvent | MouseEvent<HTMLImageElement>,
  dataMap: CropperBoxDataMap
) => any;

export type UpdateFunction = (
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
  const pointARef = useRef<Coordinates>(blankCoords);
  const idRef = useRef<string>(sid.generate());
  const drawingIndexRef = useRef(-1);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const prevSize = useRef<RefSize | undefined>(undefined);

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
    onResize: ({ width, height }: RefSize) => {
      if (
        !imageRef.current ||
        !prevSize.current ||
        (prevSize.current.width === width && prevSize.current.height === height)
      )
        return;

      const hRatio = height / prevSize.current.height;
      const wRatio = width / prevSize.current.width;

      const boxes = props.boxes.map((box) => ({
        ...box,
        x: box.x * wRatio,
        y: box.y * hRatio,
        height: box.height * hRatio,
        width: box.width * wRatio,
      }));

      props.onChange?.(undefined, undefined, boxes);

      prevSize.current = { height, width };

      drawCanvas();
    },
  });

  const onLoad: ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (!img) return;

    drawCanvas();

    const { height, width } = img.getBoundingClientRect();
    prevSize.current = { height, width };
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

  const handleMouseDown = (e: MouseEvent) => {
    const isTargetInCropper =
      e.target === imageRef.current || e.target === containerRef.current;
    if (!isTargetInCropper) return;

    const { x, y } = getCursorPosition(e);

    drawingIndexRef.current = props.boxes.length;
    pointARef.current = { x, y };
    idRef.current = sid.generate();
  };

  const handleMouseMove = (e: MouseEvent) => {
    const { onChange, boxes } = props;
    const pointB = getCursorPosition(e);

    if (pointARef.current.x && pointARef.current.y && pointB.x && pointB.y) {
      const box = {
        x: Math.min(pointARef.current.x, pointB.x),
        y: Math.min(pointARef.current.y, pointB.y),
        width: Math.abs(pointARef.current.x - pointB.x),
        height: Math.abs(pointARef.current.y - pointB.y),
        id: idRef.current,
      };
      const nextBoxes = [...boxes];
      nextBoxes[drawingIndexRef.current] = box;
      onChange?.(box, drawingIndexRef.current, nextBoxes);
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLImageElement>) => {
    pointARef.current = {};
    props.onCrop?.(e, getSelections());
  };

  const { src, width, height } = props;

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
          src={src}
          width={width}
          height={height}
          onLoad={onLoad}
          alt='image to be cropped'
          draggable={false}
        />
        {props.boxes.map((box, index) => (
          <Crop key={box.id || index} {...props} index={index} box={box} />
        ))}
      </div>
      <canvas ref={canvasRef} className={css.canvas} />
    </>
  );
};

export default MultiCrops;
