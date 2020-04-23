import  {  CSSProperties } from 'react';
import { fabric } from 'fabric';
// import { DeleteIcon, NumberIcon } from './Icons';
// import { update, remove, oneLevelEquals } from '../utils';
import {
    CropperBox,
    CropperEvent,
    // CropperEventType,
    // CropperProps,
    UpdateFunction,
} from '../types';

type Props = {
    index: number;
    box: CropperBox;
    boxes: CropperBox[];
    onChange?: UpdateFunction;
    
    onCrop: (e: CropperEvent['event'], type: CropperEvent['type']) => any;
    style?: CSSProperties;
    
    canvas:  any;
};

export const crop = (props: Props) => {
    console.log('inside crop');
    const {canvas, box} = props;
    const {x, y, height, width} = box;
    // let canvasFab = new fabric.Canvas(canvas);
    console.log(box, canvas);
    const rect = new fabric.Rect({
        top: y,
        left: x,
        width,
        height,
        fill:'red'
    });
    canvas.add(rect);
    // canvasFab.renderAll();
}