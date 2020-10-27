import { fabric } from 'fabric';
import { IRectOptions } from 'fabric/fabric-impl';
import { CropperBox } from '../types';

export type BoxType = IRectOptions & CropperBox;

const defaults = {
  fill: 'transparent',
  hasControls: true,
  borderColor: 'black',
  borderWidth: '2px',
  hasBorders: true,
  strokeWidth: 2,
  stroke: 'black',
  strokeUniform: true,
  lockMovementX: true,
  lockMovementY: true,
  hasRotatingPoint: false,
  transparentCorners: true,
};

const controlVisibilities = {
  bl: false,
  br: false,
  mb: false,
  ml: false,
  mr: false,
  mt: false,
  tl: false,
  tr: true,
  mtr: false,
};

export const Box = fabric.util.createClass(fabric.Rect, {
  initialize(options: BoxType) {
    this.callSuper('initialize', {
      ...defaults,
      _controlsVisibility: controlVisibilities,
      ...options,
      style: undefined, // clear options.style being set
      ...(options.style || {}),
    });
  },
});
