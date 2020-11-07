import { CSSProperties, FC, MouseEvent, MutableRefObject } from 'react';
import { BoxType } from './components/Box';
import { IEvent } from 'fabric/fabric-impl';
import { fabric } from 'fabric';

export type MapOf<T> = { [key in string]?: T };

export type DataUrl = string;

export type Coordinates = { x: number; y: number };

export type CropperBoxId = string;

export type CropperBox<T = any> = {
  left: number;
  top: number;
  width: number;
  height: number;
  id: CropperBoxId;
  angle: number;
  style?: CSSProperties | ((css: CSSProperties) => CSSProperties);
  noImage?: boolean;
  meta?: T;
  showCross?: boolean;
  layer?: -1 | 0 | 1;
  inert?: boolean;
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
  | 'auto-resize'
  | 'drag'
  | 'delete'
  | 'src-change'
  | 'manual-resize'
  | 'rotate'
  | 'pan'
  | 'click'
  | 'mouse-enter'
  | 'mouse-leave';

export type CropperCursorMode = 'draw' | 'pan' | 'select';

export type CropperEvent = {
  type: CropperEventType;
  event?: Event | MouseEvent<HTMLImageElement | Element> | IEvent;
};

export type CropTriggerFunctionWithImageData = (
  e: CropperEvent,
  dataMap: CropperBoxDataMap,
  currentImg?: CurrentImgParam,
  box?: BoxType
) => any;

export type UpdateFunction = (
  event: CropperEvent,
  box: CropperBox | undefined,
  index?: number,
  boxes?: CropperBox[]
) => any;

export type ImgOnLoadWithImageData = (
  map: CropperBoxDataMap,
  resetCenter: () => any
) => any;

export type SelectionHandler = (boxMap: MapOf<BoxType>) => any;

export type CropperProps = {
  cropperRef?: MutableRefObject<fabric.Canvas | null>;
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
  onSelect?: SelectionHandler;
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
