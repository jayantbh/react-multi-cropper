import { CSSProperties, FC, MouseEvent } from 'react';
import { DragEvent, ResizeEvent } from '@interactjs/types/types';
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
  | 'manual-resize'
  | 'rotate'
  | 'pan'
  | 'click'
  | 'mouse-enter'
  | 'mouse-leave';

export type CropperCursorMode = 'draw' | 'pan';

export type CropperEvent = {
  type: CropperEventType;
  event?: ResizeEvent | MouseEvent<HTMLImageElement | Element> | DragEvent;
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
  boxes: CropperBox[]
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
  onZoomGesture?: (newZoom: number) => any;
  containerClassName?: string;
  containerStyles?: CSSProperties;
  cursorMode?: CropperCursorMode;
  modifiable?: boolean;
  disableKeyboard?: boolean;
  disableMouse?: boolean;
  CustomLabel?: FC<{ box: CropperBox; index: number }>;
  boxInView?: {id?: string};
  onSetRotation?: Function;
  boxViewZoomBuffer?: number;
};

export type RefSize = {
  width: number;
  height: number;
};

export type CanvasWorker = ReturnType<typeof createWorker> | null;
