import { fabric } from 'fabric';
import { IRectOptions } from 'fabric/fabric-impl';
import { CropperBox } from '../types';

export type BoxType = IRectOptions & CropperBox;

const defaults = {
  fill: 'transparent',
  hasControls: true,
  strokeWidth: 2,
  stroke: 'black',
  strokeUniform: true,
  lockMovementX: true,
  lockMovementY: true,
  hasRotatingPoint: false,
  transparentCorners: true,
};

const controlVisibilities = (showCross: boolean = true) => ({
  bl: false,
  br: false,
  mb: false,
  ml: false,
  mr: false,
  mt: false,
  tl: false,
  tr: showCross,
  mtr: false,
});

export const Box = fabric.util.createClass(fabric.Rect, {
  initialize(options: BoxType, zoom = 1) {
    this.callSuper('initialize', {
      ...defaults,
      _controlsVisibility: controlVisibilities(options.showCross),
      ...options,
      strokeWidth: 2 / zoom,
      style: options.style, // just stored for persistence purposes
      ...(typeof options.style === 'function'
        ? options.style(defaults)
        : options.style || {}),
    });
  },
});
