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
import { getCenterCoords, getImageDimensions } from '../utils';
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
  const imageMapRef = useRef<any>({});

  // const getUpdatedDimensions = () => {
  //   if (!imageRef.current) return;

  //   const imageRefHeight = imageRef.current ?.height || 0;
  //   const imageRefWidth = imageRef.current ?.width || 0;
  //   const containerRefHeight = containerRef.current ?.offsetHeight || 0;
  //   const containerRefWidth = containerRef.current ?.offsetWidth || 0;
  //   const contAspectRatio = containerRefWidth / containerRefHeight;
  //   const imgAspectRatio = imageRefWidth / imageRefHeight || 1;
  //   let imgBaseHeight, imgBaseWidth;
  //   if (contAspectRatio > imgAspectRatio) {
  //     imgBaseHeight = containerRefHeight;
  //     imgBaseWidth = (imgBaseHeight || 0) * imgAspectRatio;
  //   } else {
  //     imgBaseWidth = containerRefWidth;
  //     imgBaseHeight = imgBaseWidth/imgAspectRatio;
  //   }
  //   console.log(contAspectRatio, imgAspectRatio, imgBaseHeight, imgBaseWidth, containerRefHeight,containerRefWidth);
  //   // const imgBaseHeight = (imgAspectRatio > contAspectRatio) ? containerRefHeight : imageRefHeight;
  //   // const imgBaseWidth = (imgBaseHeight || 0) * imgAspectRatio;
  //   return { height: imgBaseHeight, width: imgBaseWidth };
  // };


  const getSelections = (box: any) =>
    getCroppedImageFromBox(imageRef.current, canvasFab.current, rotation, staticPanCoords, [box]);


  useEffect(() => {

    let canvas = new fabric.Canvas("main-canvas");
    canvas.setDimensions({ width: containerRef.current ?.offsetWidth || 1000, height: containerRef.current ?.offsetHeight || 1000 });
    canvasFab.current = canvas;
  }, [])
  useEffect(() => {


    fabric.Image.fromURL(props.src, (img: any) => {

      img.set('objectCaching', false);

      imageRef.current = img;
      let dimensions: any = getImageDimensions(imageRef.current, canvasFab.current.getElement());

      img.scaleToWidth(dimensions.width);
      img.scaleToHeight(dimensions.height);


      canvasFab.current.setBackgroundImage(img);
      canvasFab.current.renderAll();
      let imgValues = getCenterCoords(img);
      setStaticPanCoords({ x: imgValues.translateX, y: imgValues.translateY });
      performCanvasPaint(img, canvasFab.current, canvasRef.current, rotation);

    },
      { selectable: false, hasRotatingPoint: false, lockScalingX: true, lockScalingY: true }
    );
  }, [])


  useEffect(() => {
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
      handleCrop('drag', e.target);

    })
    // canvasFab.current.on("object:added", (e: any )=> {

    // })
    canvasFab.current.on("object:removed", (e: any) => {
      
      imageMapRef.current[e.target.id] = undefined;
      const boxId = e.target.id;
      const currentImgParam: CurrentImgParam = boxId
        ? {
          boxId,
          dataUrl: imageMapRef.current[boxId],
        }
        : undefined;

      let boxes = [...boxesRef.current];
      const index = boxes.findIndex((box: any) => boxId === box.id);
      if (index != -1)
          boxes.splice(index,1);
      boxesRef.current = boxes;
      onChange ?.(
        { type: 'delete', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        boxesRef.current,
      );
      props.onCrop ?.({ type: 'delete' }, imageMapRef.current, currentImgParam);



      isDrawing.current = false;

      // props.onCrop ?.({  }, imageMapRef.current, e.target.id);

    })

    return () => {
      canvasFab.current.off('mouse:down');
      canvasFab.current.off('mouse:move');
      canvasFab.current.off('mouse:up');

      canvasFab.current.off("object:modified");
      canvasFab.current.off("object:removed");
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
    // handleCrop('draw');
  }, [props.boxes])

  const handleCrop = (type: CropperEvent['type'], box: any) => {
    const selections = getSelections(box);
    imageMapRef.current = { ...imageMapRef.current, ...selections };
    lastUpdatedBox.current = null;
    const boxId = box.id;
    const currentImgParam: CurrentImgParam = boxId
      ? {
        boxId,
        dataUrl: imageMapRef.current[boxId],
      }
      : undefined;

    props.onCrop ?.({ type }, imageMapRef.current, currentImgParam);

    isDrawing.current = false;
  };


  const handleMouseDown = (e: MouseEvent) => {
    if (cursorMode === 'pan') {
      pointA.current = canvasFab.current.getPointer(e);
      setIsPanning(true);
    } else
      if (cursorMode === 'draw') {
        pointA.current = canvasFab.current.getPointer(e);
        drawingIndex.current = boxesRef.current.length;
        id.current = sid.generate();
        isDrawing.current = true;
        let rect: CustomRect = new CustomRect(id.current, rotationRef.current,
          {
            top: pointA.current.y,
            left: pointA.current.x,
            fill: 'transparent',
            hasBorders: true,
            stroke: 'black',
            strokeWidth: 2,
            hasRotatingPoint: false,
            transparentCorners: true,
            strokeUniform: true,
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
      [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

        const translateX = rect.left + xDiff;
        const translateY = rect.top + yDiff;
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
      const boxes = boxesRef.current;
      boxes[drawingIndex.current] = lastUpdatedBox.current;
      // const nextBoxes = [...boxes, lastUpdatedBox.current];
      onChange ?.(
        { type: 'draw', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        boxes,
      );

    }
  };
  const handleMouseUp = (e: MouseEvent) => {
    if (cursorMode === 'pan') {

    } else if (cursorMode === 'draw') {
      if (!isDrawing.current) return;
      if (!lastUpdatedBox.current) return;
      

      isDrawing.current = false;
      console.log('mousup', e);
      handleCrop('draw', lastUpdatedBox.current);


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



