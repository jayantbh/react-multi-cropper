import { CSSProperties, FC, MouseEvent } from 'react';
import createWorker from 'offscreen-canvas/create-worker';

export type DataUrl = string;

export type Coordinates = { x: number; y: number };
export type CartesianSize = Coordinates;

export type CropperBoxId = string;

export type CropperBox<T = any> = {
  x: number;
  y: number;
  width: number;
  height: number;
  id: CropperBoxId;
  rotation: number;
  style?: CSSProperties | ((css: CSSProperties) => CSSProperties);
  labelStyle?: CSSProperties | ((css: CSSProperties) => CSSProperties);
  noImage?: boolean;
  meta?: T;
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
  | 'load'
  | 'draw'
  | 'draw-end'
  | 'resize'
  | 'zoom'
  | 'drag'
  | 'delete'
  | 'src-change'
  | 'rotate'
  | 'pan'
  | 'click'
  | 'mouse-enter'
  | 'mouse-leave';

export type CropperCursorMode = 'draw' | 'pan';

export type CropperEvent = {
  type: CropperEventType;
  event?: MouseEvent<HTMLImageElement | Element> | DragEvent;
};

export type CropTriggerFunctionWithImageData = (
  e: CropperEvent,
  dataMap: CropperBoxDataMap,
  currentImg?: CurrentImgParam
) => any;

export type UpdateFunction = (
  event: CropperEvent,
  box: CropperBox | undefined,
  index: number | undefined,
  boxes?: CropperBox[]
) => any;

export type ImgOnLoadWithImageData = (
  map: CropperBoxDataMap,
  resetCenter: () => any
) => any;

export type CropperProps = {
  src: string;
  zoom?: number;
  rotation?: number; // degrees
  boxes: CropperBox[];
  onChange?: UpdateFunction;
  onDelete?: UpdateFunction;
  onBoxMouseEnter?: UpdateFunction;
  onBoxMouseLeave?: UpdateFunction;
  onBoxClick?: UpdateFunction;
  onLoad?: ImgOnLoadWithImageData;
  onCrop?: CropTriggerFunctionWithImageData;
  onZoomGesture?: (newZoom: number, prevZoom: number) => any;
  containerClassName?: string;
  containerStyles?: CSSProperties;
  imageStyles?: CSSProperties;
  cursorMode?: CropperCursorMode;
  disableKeyboard?: boolean;
  disableMouse?: {
    all?: boolean;
    zoom?: boolean;
    pan?: boolean;
    draw?: boolean;
  };
  CustomLabel?: FC<{ box: CropperBox; index: number }>;
  boxInView?: { id?: string; rotate?: boolean; panInView?: boolean };
  onSetRotation?: Function;
  boxViewZoomBuffer?: number;
};

export type RefSize = {
  width: number;
  height: number;
};

export type CanvasWorker = ReturnType<typeof createWorker> | null;
