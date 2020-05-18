import { CSSProperties, MouseEvent } from 'react';
import { DragEvent, ResizeEvent } from '@interactjs/types/types';
import createWorker from 'offscreen-canvas/create-worker';

export type DataUrl = string;

export type Coordinates = { x: number; y: number };
export type CartesianSize = Coordinates;

export type CropperBoxId = string;

export type CropperBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  id: CropperBoxId;
  rotation: number;
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
  | 'select'
  | 'mouse-enter'
  | 'mouse-leave';

export type CropperCursorMode = 'draw' | 'pan';

export type CropperEvent = {
  type: CropperEventType;
  event?: ResizeEvent | MouseEvent<HTMLImageElement> | MouseEvent | DragEvent;
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
  onSelect?: UpdateFunction;
  onMouseEnter?: UpdateFunction;
  onMouseLeave?: UpdateFunction;
  onLoad?: ImgOnLoadWithImageData;
  onCrop?: CropTriggerFunctionWithImageData;
  onZoomGesture?: (newZoom: number) => any;
  containerClassName?: string;
  containerStyles?: CSSProperties;
  cursorMode?: CropperCursorMode;
  modifiable?: boolean;
  disableKeyboard?: boolean;
  disableMouse?: boolean;
  selected: string[];
};

export type RefSize = {
  width: number;
  height: number;
};

export type CanvasWorker = ReturnType<typeof createWorker> | null;
