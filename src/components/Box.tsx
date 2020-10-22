import { fabric } from 'fabric';
import { IRectOptions } from 'fabric/fabric-impl';

type Props = IRectOptions & {
  id?: string;
};

export const Box = fabric.util.createClass(fabric.Rect, {
  initialize(options: Props = {}) {
    this.callSuper('initialize', {
      fill: 'transparent',
      hasControls: true,
      borderColor: 'black',
      borderWidth: '2px',
      strokeWidth: 2,
      stroke: 'black',
      lockMovementX: true,
      lockMovementY: true,
      _controlsVisibility: {
        bl: false,
        br: false,
        mb: false,
        ml: false,
        mr: false,
        mt: false,
        tl: false,
        tr: true,
        mtr: false,
      },
      ...options,
    });
  },
});
