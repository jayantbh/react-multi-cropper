import React, { FC, MouseEvent, useRef, useEffect, useState } from 'react';
import sid from 'shortid';
import { fabric } from 'fabric';
import * as controls from 'fabric-customise-controls';
import css from './MultiCrops.module.scss';
import close from '../close.svg';
import {
  Coordinates,
  CropperEvent,
  CropperProps,
  CurrentImgParam,
  CustomRect,
} from '../types';
import {
  getCroppedImageFromBox,
  performCanvasPaint,
} from './MultiCrops.helpers';
import { getCenterCoords } from '../utils';
const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};
console.log(controls)
let canvas: any = fabric.Canvas;
let object: any = fabric.Object;
canvas.prototype.customiseControls({
  tr: {
    action: 'remove',
    cursor: 'pointer'
  },
})
object.prototype.customiseCornerIcons({
  settings: {
    borderColor: 'black',
    cornerSize: 25,
    cornerShape: 'rect',
    cornerBackgroundColor: 'black',
    cornerPadding: 10
  },
  tr: {
    icon: close
  },
})

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pointA = useRef<Partial<Coordinates>>(blankCoords);
  const id = useRef<string>(sid.generate());
  const drawingIndex = useRef(-1);
  const lastUpdatedBox = useRef<any>(null);
  const isDrawing = useRef<boolean>(false);
  const mainCanvasRef = useRef<any>(null)

  const [isPanning, setIsPanning] = useState(false);
  const [staticPanCoords, setStaticPanCoords] = useState({ x: 0, y: 0 });
  let canvasFab = useRef<any>(null);
  const rotationRef = useRef<any>(null);
  const boxesRef = useRef<any>(props.boxes);
  const activeGroupRef = useRef<any>(null);

  const getUpdatedDimensions = () => {
    if (!imageRef.current) return;

    const imageRefHeight = imageRef.current ?.height || 0;
    const imageRefWidth = imageRef.current ?.width || 0;
    const containerRefHeight = canvasFab.current ?.getHeight() || 0;
    const imgAspectRatio = imageRefWidth / imageRefHeight || 1;
    
    const imgBaseHeight = containerRefHeight;
    const imgBaseWidth = (imgBaseHeight || 0) * imgAspectRatio;
    return { height: imgBaseHeight, width: imgBaseWidth };
  };


  const getSelections = () =>
    getCroppedImageFromBox(imageRef.current, canvasFab.current, rotation, staticPanCoords);

 
  useEffect(() => {

    let canvas = new fabric.Canvas("main-canvas");
    canvas.setDimensions({ width: containerRef.current ?.offsetWidth || 1000, height: containerRef.current ?.offsetHeight || 1000 });
    canvasFab.current = canvas;
  }, [])
  useEffect(() => {


    fabric.Image.fromURL(props.src, (img: any) => {

      img.set('objectCaching', false);
     
      imageRef.current = img;
      let dimensions: any = getUpdatedDimensions();
      
      img.scaleToWidth(dimensions.width);
      img.scaleToHeight(dimensions.height);

    
      canvasFab.current.setBackgroundImage(img);
      canvasFab.current.renderAll();
      let imgValues = getCenterCoords(img);
      console.log('translate coords', imgValues.translateX, imgValues.translateY)
      setStaticPanCoords({ x: imgValues.translateX, y: imgValues.translateY });
      performCanvasPaint(img, canvasFab.current, canvasRef.current, rotation);

    },
      { selectable: false, hasRotatingPoint: false, lockScalingX: true, lockScalingY: true }
    );
  }, [])


  useEffect(() => {
    console.log('rotationn', rotation);
    console.log(canvasFab.current.getObjects());
    if (imageRef.current) {
      canvasFab.current.discardActiveObject();
      canvasFab.current.renderAll();
     
      activeGroupRef.current = new fabric.ActiveSelection([imageRef.current, ...canvasFab.current.getObjects()], {
        hasControls: false,
       
      })
      canvasFab.current.setActiveObject(activeGroupRef.current);
      if (activeGroupRef.current != null) {
        activeGroupRef.current.rotate(rotation - rotationRef.current);

        canvasFab.current.discardActiveObject();

        canvasFab.current.renderAll();
      }

    }
    rotationRef.current = rotation;
   

  }, [rotation])

  useEffect(() => {
    if (cursorMode == 'pan') {
      canvasFab.current.set({ selection: false })
    } else {
      canvasFab.current.set({ selection: true })
    }
    canvasFab.current.on('mouse:down', (e: any) => {
      console.log('mouse selected');
      if (!e.target || e.target.type !== 'rect') {
        handleMouseDown(e);
      }
    });
    canvasFab.current.on('mouse:move', (e: any) => {
      handleMouseMove(e);
    });
    canvasFab.current.on('mouse:up', (e: MouseEvent) => { handleMouseUp(e); });
    canvasFab.current.on("object:modified", (e: any) => {
      console.log('changed', e);
      handleCrop('drag');

    })
   
    return () => {
      canvasFab.current.off('mouse:down');
      canvasFab.current.off('mouse:move');
      canvasFab.current.off('mouse:up');

      canvasFab.current.off("object:modified");
    }
  }, [cursorMode, staticPanCoords])

  useEffect(() => {
    let { zoom = 0 } = props;
    console.log('zoom', zoom, props.zoom);
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    if (imageRef.current) {
      let imgValues = getCenterCoords(imageRef.current);
      canvasFab.current.zoomToPoint({ x: imgValues.translateX, y: imgValues.translateY }, zoom);
    }
  }, [props.zoom])

  useEffect(() => {
    boxesRef.current = props.boxes;
    handleCrop('draw');
  }, [props.boxes])

  const handleCrop = (type: CropperEvent['type']) => {
    const selections = getSelections();

    console.log(selections);
    const boxId = lastUpdatedBox.current ?.id;
    const currentImgParam: CurrentImgParam = boxId
      ? {
        boxId,
        dataUrl: selections[boxId],
      }
      : undefined;

    props.onCrop ?.({ type }, selections, currentImgParam);

    isDrawing.current = false;
  };


  const handleMouseDown = (e: MouseEvent) => {
    if (cursorMode === 'pan') {
      pointA.current = canvasFab.current.getPointer(e);
      setIsPanning(true);
    } else
      if (cursorMode === 'draw') {
        pointA.current = canvasFab.current.getPointer(e);
        drawingIndex.current = props.boxes.length;
        id.current = sid.generate();
        isDrawing.current = true;
        let rect: CustomRect = new CustomRect(id.current, rotationRef.current,
          {
            top: pointA.current.y,
            left: pointA.current.x,
            fill: 'transparent',
            hasBorders: true,
            stroke: 'black',
            strokeWidth: 1,
            hasRotatingPoint: false,
            transparentCorners: true,

          }
        )
        canvasFab.current ?.add(rect);

        lastUpdatedBox.current = rect;
        canvasFab.current ?.renderAll();
      }
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (cursorMode === 'pan') {
      const pointB = canvasFab.current.getPointer(e);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
     
      let intialPoint: any = pointA.current;
      const xDiff = -1 * (intialPoint.x - pointB.x);
      const yDiff = -1 * (intialPoint.y - pointB.y);
      console.log(xDiff, yDiff);
      [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

        const translateX = rect.left + xDiff;
        const translateY = rect.top + yDiff;
        console.log(rect.left, rect.top, translateX, translateY)
        rect.set({ left: translateX, top: translateY });
        return;
      })


      canvasFab.current.renderAll();
      pointA.current = pointB;
     
    } else if (cursorMode === 'draw') {
      const pointB = canvasFab.current.getPointer(e);
      if (!isDrawing.current) return;
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
     
      let rect = lastUpdatedBox.current;
      rect.set({
        left: Math.min(pointA.current.x, pointB.x),
        top: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
      })
      canvasFab.current.renderAll();
      lastUpdatedBox.current = rect;
    
    }
  };
  const handleMouseUp = (e: MouseEvent) => {
    if (cursorMode === 'pan') {
      
    } else if (cursorMode === 'draw') {
      if (!isDrawing.current) return;
      if (!lastUpdatedBox.current) return;
      const boxes = boxesRef.current;
      const nextBoxes = [...boxes, lastUpdatedBox.current];

      isDrawing.current = false;

      onChange ?.(
        { type: 'draw', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        nextBoxes,
      );
      lastUpdatedBox.current = null;


    }
    pointA.current = {};
  };

  const onChange: CropperProps['onChange'] = (e, box, index, boxes) => {
    lastUpdatedBox.current = box;

    props.onChange ?.(e, box, index, boxes);
  };

  return (
    <>
      <div
        className={[
          css.container,
          cursorMode === 'pan' ? css.pan : '',
          isPanning ? css.panning : '',
          props.containerClassName || '',
        ].join(' ')}
        style={props.containerStyles || blankStyles}
        ref={containerRef}
        draggable={false}
      >
        <canvas
          className={[
            cursorMode === 'pan' ? css.pan : '',
            isPanning ? css.panning : '',
            props.containerClassName || '',
          ].join(' ')}
          ref={mainCanvasRef} id="main-canvas" style={{ width: '100%', height: '100%' }} ></canvas>
      </div>
      <canvas id="canvas-fab" className={css.canvas} ref={canvasRef} />
    </>
  );
};

export default MultiCrops;



