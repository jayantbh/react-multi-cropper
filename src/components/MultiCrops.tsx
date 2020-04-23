import React, { FC, MouseEvent, useRef, useEffect, useState } from 'react';
import sid from 'shortid';
// import useResizeObserver from 'use-resize-observer';
import { fabric } from 'fabric';
// import Crop from './Crop_old';
// import { crop as crop_new } from './Crop';
import css from './MultiCrops.module.scss';
// import {FabricCanvas} from './canvas';
import {
  Coordinates,
  // CropperBox,
  CropperEvent,
  CropperProps,
  CurrentImgParam,
  // RefSize,
} from '../types';
import {
  // getAbsoluteCursorPosition,
  // getCursorPosition,
  // getImageMapFromBoxes,
  getCroppedImageFromBox,
  performCanvasPaint,
  // onImageLoad,
  // onImageResize,
  // performCanvasPaint,
  // useCentering,
  // usePropResize,
  // usePropRotation,
} from './MultiCrops.helpers';

const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};

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
  // const prevSize = useRef<RefSize | undefined>(undefined);
  const lastUpdatedBox = useRef<any>(null);
  const isDrawing = useRef<boolean>(false);
  const mainCanvasRef = useRef<any>(null)
  // const panFrame = useRef(-1);
  // const rectBox = useRef<any>(null);
  // const autoSizeTimeout = useRef(-1);

  const [isPanning, setIsPanning] = useState(false);
  const [staticPanCoords, setStaticPanCoords] = useState({ x: 0, y: 0 });
  // const [activePanCoords, setActivePanCoords] = useState({ x: 0, y: 0 });
  let canvasFab = useRef<any>(null);
  const rotationRef = useRef<any>(null);
  const boxesRef = useRef<any>(props.boxes);
  const activeGroupRef = useRef<any>(null);
  // const [centerCoords, setCenterCoords] = useCentering(
  //   imageRef.current,
  //   containerRef.current,
  //   activePanCoords
  // );
  // const [centerCoords, setCenterCoords] = useState({ x: 0, y: 0 });


  // const drawCanvas = () =>
  //   performCanvasPaint(
  //     imageRef.current,
  //     containerRef.current,
  //     canvasRef.current,
  //     activePanCoords,
  //     rotation
  //   );
  const getUpdatedDimensions = (

  ) => {
    if (!imageRef.current) return;

    const imageRefHeight = imageRef.current ?.height || 0;
    const imageRefWidth = imageRef.current ?.width || 0;
    const containerRefHeight = canvasFab.current ?.getHeight() || 0;
    // const containerRefWidth = canvasFab.current?.getWidth() || 0;
    const imgAspectRatio = imageRefWidth / imageRefHeight || 1;
    // const containerAspectRatio = containerRefWidth / containerRefHeight || 1;
    // console.log('aspect rations',imgAspectRatio, containerAspectRatio);
    // const newZoomOffset =
    //   imgAspectRatio > containerAspectRatio
    //     ? (containerRefWidth || 1) / (imageRefWidth || 1)
    //     : (containerRefHeight || 1) / (imageRefHeight || 1);
    // const {
    //   height,
    // } = canvasFab.current.getElement().getBoundingClientRect();
    const imgBaseHeight = containerRefHeight;
    const imgBaseWidth = (imgBaseHeight || 0) * imgAspectRatio;
    return { height: imgBaseHeight, width: imgBaseWidth };

    // const { height = 0, width = 0 } =
    //   imageRef.current?.getBoundingClientRect() || {};

    // const fields: Dimensions = {
    //   imgRectHeight: height,
    //   imgRectWidth: width,
    //   imgBaseHeight,
    //   imgBaseWidth,
    // };

    // doStateUpdate && setDimensions(fields);
    // return fields;
  };


  const getSelections = () =>
    getCroppedImageFromBox(imageRef.current, canvasFab.current, rotation, boxesRef.current, staticPanCoords);

  // usePropResize(
  //   props.width,
  //   props.height,
  //   props.onCrop,
  //   drawCanvas,
  //   getSelections
  // );
  useEffect(() => {

    let canvas = new fabric.Canvas("main-canvas");
    canvas.setDimensions({ width: containerRef.current ?.offsetWidth || 1000, height: containerRef.current ?.offsetHeight || 1000 });
    canvasFab.current = canvas;
  }, [])
  useEffect(() => {


    fabric.Image.fromURL(props.src, (img: any) => {

      img.set('objectCaching', false);
      // let aspectRatio = img.width/img.height;
      // img.scaleToWidth(canvasFab.current.getWidth());
      // img.set({
      //     top: 0,
      //     left: 0,
      //     height:500,width:750,scale: 1

      //   })
      // img.set("originX", "center");
      // img.set("originY", "center");
      // img.set('objectCaching', true);
      imageRef.current = img;
      let dimensions: any = getUpdatedDimensions();
      // img.set({width: dimensions.width, height: dimensions.height});
      // img.scale(1);
      // img.height = dimensions.height;
      // img.width = dimensions.width;
      img.scaleToWidth(dimensions.width);
      img.scaleToHeight(dimensions.height);

      // activeGroupRef.current = new fabric.ActiveSelection([imageRef.current, ...canvasFab.current.getObjects()],{
      //   hasControls: false
      // })
      canvasFab.current.setBackgroundImage(img);
      canvasFab.current.renderAll();
      console.log('translate coords', img.translateX, img.translateY)
      setStaticPanCoords({ x: img.translateX, y: img.translateY });
      performCanvasPaint(img, canvasFab.current, canvasRef.current, rotation);

    },
      { selectable: false, hasRotatingPoint: false, lockScalingX: true, lockScalingY: true }
    );
  }, [])


  useEffect(() => {
    console.log('rotationn', rotation);
    console.log(canvasFab.current.getObjects());
    if (imageRef.current) {
      console.log(imageRef.current.left, imageRef.current.top, imageRef.current.translateX, imageRef.current.translateY);
      canvasFab.current.discardActiveObject();
      canvasFab.current.renderAll();
      // var activeObject = new fabric.ActiveSelection([imageRef.current, ...canvasFab.current.getObjects()], {

      // });
      activeGroupRef.current = new fabric.ActiveSelection([imageRef.current, ...canvasFab.current.getObjects()], {
        hasControls: false,
        // originX:'center',
        // originY:'center'
      })
      canvasFab.current.setActiveObject(activeGroupRef.current);
      if (activeGroupRef.current != null) {
        activeGroupRef.current.rotate(rotation - rotationRef.current);

        canvasFab.current.discardActiveObject();

        canvasFab.current.renderAll();
      }

    }
    rotationRef.current = rotation;
    // performCanvasPaint(imageRef.current, canvasFab.current, canvasRef.current, rotation);
    // setTimeout(() => {

    //   getCroppedImageFromBox(imageRef.current, canvasFab.current, canvasRef.current, rotation);
    // }, 1000)

  }, [rotation])

  useEffect(() => {
    if (cursorMode == 'pan') {
      canvasFab.current.set({selection: false})
    } else {
      canvasFab.current.set({selection: true})
    }
    canvasFab.current.on('mouse:down', (e: any) => {
      console.log('mouse selected');
      // isDrawing.current = false;
      if (!e.target || e.target.type !== 'rect') {
        handleMouseDown(e);
      }
    });
    canvasFab.current.on('mouse:move', (e: any) => {
      if (!e.target || e.target.type !== 'rect')
        handleMouseMove(e);
    });
    canvasFab.current.on('mouse:up', (e: MouseEvent) => { handleMouseUp(e); });
    canvasFab.current.on("object:modified", (e: any) => {
      console.log('changed', e);
      handleCrop('drag');

    })
    // }
    // canvasFab.current.on("object:moved", (e: any) => {
    //   console.log('mocved',e);
    // })
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
    canvasFab.current.setZoom(zoom);
  }, [props.zoom])




  // usePropRotation(
  //   rotation,
  //   props.boxes,
  //   props.onChange,
  //   props.onCrop,
  //   drawCanvas,
  //   getSelections
  // );

  // useResizeObserver({
  //   ref: imageRef,
  //   onResize: onImageResize(
  //     imageRef.current,
  //     containerRef.current,
  //     canvasRef.current,
  //     prevSize,
  //     autoSizeTimeout,
  //     setCenterCoords,
  //     staticPanCoords,
  //     activePanCoords,
  //     rotation,
  //     props.src,
  //     props.boxes,
  //     props.onChange,
  //     props.onCrop
  //   ),
  // });

  // const onLoad = onImageLoad(
  //   prevSize,
  //   lastUpdatedBox,
  //   props.onLoad,
  //   drawCanvas,
  //   getSelections
  // );
  // const onLoad = () => {


  // }

  useEffect(() => {
    boxesRef.current = props.boxes;
    handleCrop('draw');
  }, [props.boxes])

  const handleCrop = (type: CropperEvent['type']) => {
    // drawCanvas();
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
    // const isTargetInCropper =
    //   e.target === mainCanvasRef.current || e.target === containerRef.current;
    //   console.log('handle mouse down', e);
    // if (!isTargetInCropper) return;

    if (cursorMode === 'pan') {
      pointA.current = canvasFab.current.getPointer(e);
      setIsPanning(true);
    } else
      if (cursorMode === 'draw') {
        // pointA.current = getCursorPosition(e, containerRef.current, centerCoords);
        pointA.current = canvasFab.current.getPointer(e);
        drawingIndex.current = props.boxes.length;
        id.current = sid.generate();
        isDrawing.current = true;
        // console.log('event coords', e.clientX, e.clientY, canvasFab.current.getPointer(e));
        // let rect = new fabric.Rect(
        //   {
        //     top: pointA.current.y,
        //     left: pointA.current.x,
        //     width: 0,
        //     height: 0,
        //     fill: 'transparent',
        //     hasBorders: true,
        //     stroke: 'black',
        //     strokeWidth: 1,
        //   }
        // )
        // rectBox.current = rect;

      }
  };
  // canvasFab.current.on('mouse:down',)
  const handleMouseMove = (e: MouseEvent) => {
    // const { onChange,boxes } = props;
    if (cursorMode === 'pan') {
      const pointB = canvasFab.current.getPointer(e);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
      // let activeObject = canvasFab.current.getActiveObject();
      // var activeObject = new fabric.ActiveSelection([imageRef.current, ...canvasFab.current.getObjects()], {

      // });
      // canvasFab.current.setActiveObject(activeObject);
      let intialPoint: any = pointA.current;
      const xDiff = -1 * (intialPoint.x - pointB.x);
      const yDiff = -1 * (intialPoint.y - pointB.y);
      console.log(xDiff, yDiff);
      [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {
        // const rect = activeGroupRef.current.getBoundingRect();

        const translateX = rect.left + xDiff;
        const translateY = rect.top + yDiff;
        console.log(rect.left, rect.top, translateX, translateY)
        rect.set({ left: translateX, top: translateY });
        return;
      })

      // activeGroupRef.current.set({ left: translateX, top: translateY });
      canvasFab.current.renderAll();
      pointA.current = pointB;
      // console.log(rect,xDiff, yDiff, translateX, translateY)
      // // cancelAnimationFrame(panFrame.current);
      // // panFrame.current = requestAnimationFrame(() =>
      // //   setActivePanCoords({
      // //     x: xDiff,
      // //     y: yDiff,
      // //   })
      // // );
      // // imageRef.current ?.set({ left: staticPanCoords.x + activePanCoords.x, top: staticPanCoords.y + activePanCoords.y });
      // // canvasFab.current ?.item(0).set({ left: staticPanCoords.x + activePanCoords.x, top: staticPanCoords.y + activePanCoords.y });
      // // canvasFab.current ?.renderAll();
      // // let movex = Math
      // if (activeObject) {
      //   
      //   canvasFab.current.renderAll();
      //   canvasFab.current.discardActiveObject();
      // }
    } else if (cursorMode === 'draw') {
      // const pointB = getCursorPosition(e, containerRef.current, centerCoords);
      const pointB = canvasFab.current.getPointer(e);
      if (!isDrawing.current) return;
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
      // console.log(pointA.current, pointB, centerCoords);
      const box = {
        x: Math.min(pointA.current.x, pointB.x),
        y: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
        id: id.current,
        rotation: rotationRef.current,
      };
      // const nextBoxes = [...boxes];
      // nextBoxes[drawingIndex.current] = box;
      lastUpdatedBox.current = box;
      // rectBox.current ?.set({ left: box.x, top: box.y, width: box.width, height: box.height });
      // canvasFab.current ?.add(rectBox.current);
      // canvasFab.current.setActiveObject(rectBox.current);
      // canvasFab.current.renderAll();
      // onChange ?.(
      //   { type: 'draw', event: e },
      //   box,
      //   drawingIndex.current,
      //   nextBoxes
      // );
    }
  };
  const handleMouseUp = (e: MouseEvent) => {
    // const { boxes } = props;
    if (cursorMode === 'pan') {
      // cancelAnimationFrame(panFrame.current);
      // setIsPanning(false);
      
      // pointA.current = null;

      // handleCrop('pan');
    } else if (cursorMode === 'draw') {
      if (!isDrawing.current) return;
      if (!lastUpdatedBox.current) return;
      // rectBox.current = null;
      let rect: any = new fabric.Rect(
        {
          top: lastUpdatedBox.current.y,
          left: lastUpdatedBox.current.x,
          width: lastUpdatedBox.current.width,
          height: lastUpdatedBox.current.height,
          fill: 'transparent',
          hasBorders: true,
          stroke: 'black',
          strokeWidth: 1,
          hasRotatingPoint: false,
          transparentCorners: true,
          // angle: rotationRef.current
        }
      )

      rect.id = lastUpdatedBox.current.id;
      const boxes = boxesRef.current;
      // rect.originX = lastUpdatedBox.current.x;
      // rect.originY = lastUpdatedBox.current.y
      const nextBoxes = [...boxes, lastUpdatedBox.current];

      // rect.toObject =  () => ({id: lastUpdatedBox.current.id});
      // rect.id = lastUpdatedBox.current.id;
      // rect.set('id',  lastUpdatedBox.current.id);
      // rectBox.current = rect;
      canvasFab.current ?.add(rect);
      // canvasFab.current.setActiveObject(rect);

      // canvasFab.current ?.discardActiveObject();
      canvasFab.current ?.renderAll();
      // handleCrop(e, 'draw-end');
      isDrawing.current = false;

      onChange ?.(
        { type: 'draw', event: e },
        rect,
        drawingIndex.current,
        nextBoxes,
        // canvasFab.current.getObjects()
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
        // onMouseDown={handleMouseDown}
        // onMouseMove={handleMouseMove}
        // onMouseUp={handleMouseUp}
        ref={containerRef}
        draggable={false}
      >
        {/* <FabricCanvas /> */}
        <canvas
        className={[
          cursorMode === 'pan' ? css.pan : '',
          isPanning ? css.panning : '',
          props.containerClassName || '',
        ].join(' ')}
         ref={mainCanvasRef} id="main-canvas" style={{ width: '100%', height: '100%' }} ></canvas>
        {/* <img
          ref={imageRef}
          src={props.src}
          width={props.width}
          height={props.height}
          alt='image to be cropped'
          draggable={false}
          className={css.img}
          style={{
            transform: `
              translate(
              ${staticPanCoords.x + activePanCoords.x}px,
              ${staticPanCoords.y + activePanCoords.y}px)
              rotate(${rotation}deg)
            `,
          }}
        /> */}
        <div
          style={{
            height: 0,
            width: 0,
            position: 'absolute',
            // top: `${centerCoords.y}px`,
            // left: `${centerCoords.x}px`,
          }}
        >
          {/* {props.boxes.map((box, index) => (
            <Crop
              {...props}
              key={box.id || index}
              index={index}
              box={box}
              onChange={onChange}
              onCrop={handleCrop}
              style={{
                pointerEvents: cursorMode === 'pan' ? 'none' : 'auto',
                transform: `rotate(${box.rotation}deg)`,
              }}
            />
          ))} */}
          {/* {props.boxes.map((box, index) => (
            crop_new({
              index,
              box,
              boxes: props.boxes,
              onChange,
              onCrop: handleCrop,
              style: {
                pointerEvents: cursorMode === 'pan' ? 'none' : 'auto',
                transform: `rotate(${box.rotation}deg)`,
              },
              canvas: canvasFab,
            })
          ))} */}
        </div>
      </div>
      <canvas id="canvas-fab" className={css.canvas} ref={canvasRef} />
    </>
  );
};

export default MultiCrops;



