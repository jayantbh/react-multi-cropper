import { fabric } from 'fabric';
import { IRectOptions } from 'fabric/fabric-impl';

type Props = IRectOptions & {
  id?: string;
};

export const Box = fabric.util.createClass(fabric.Rect, {
  initialize(options: Props = {}) {
    this.callSuper('initialize', {
      fill: 'transparent',
      hasControls: false,
      borderColor: 'black',
      borderWidth: '2px',
      strokeWidth: 2,
      stroke: 'black',
      lockMovementX: true,
      lockMovementY: true,
      ...options,
    });
  },
});
