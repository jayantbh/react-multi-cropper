import React, { FC, MouseEvent, useRef, useEffect, useState } from 'react';
import sid from 'shortid';
import { fabric } from 'fabric';
import * as controls from 'fabric-customise-controls';
import css from './MultiCrops.module.scss';
// import close from '../close.svg';
 import cross from '../cross.svg';
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
  useScrollbars
} from './MultiCrops.helpers';
import Scrollbar from './Scrollbar';
const scrollbarSpacing = 6;;

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
  
  tr: {
    icon: cross,
    settings: {
      borderColor: 'red',
      cornerSize: 25,
      cornerShape: 'circle',
      cornerBackgroundColor: 'white',
      cornerPadding: 10
    },
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
  const imageSrcMap = useRef<any>({});
  const [isPanning, setIsPanning] = useState(false);
  let canvasFab = useRef<any>(null);
  const rotationRef = useRef<any>(rotation);
  // const boxesRef = useRef<any>(props.boxes);
  const activeGroupRef = useRef<any>(null);
  const imageMapRef = useRef<any>({});
  const imageSource = useRef<any>(props.src);
  const isReset = useRef<any>(false);
  
  const [scrollPositions, setScrollPositions] = useState<any>(useScrollbars(
    canvasFab.current,
    imageRef.current,
  ));
  // const staticPanCoords = useRef({ x: 0, y: 0 });

  // const setStaticPanCoords = ({ x, y }: Coordinates) => {
  //   staticPanCoords.current = { x, y };
  // }



  const drawBoxes = (boxes: any) => {
    console.log('boxes', canvasFab.current.getObjects());
    boxes.map((box: any) => {
      let rect: CustomRect = new CustomRect(box.id, box.initRotation || 0,
        {
          height: box.height,
          width: box.width,
          top: box.top,
          left: box.left,
          fill: 'transparent',
          hasBorders: true,
          stroke: 'black',
          strokeWidth: 2,
          hasRotatingPoint: false,
          transparentCorners: true,
          strokeUniform: true,
          angle: box.angle
        }
      )
      canvasFab.current ?.add(rect);
    })
    handleAllCrops(canvasFab.current.getObjects());
    canvasFab.current.renderAll();
  }

  const getSelections = (box: any) =>
    getCroppedImageFromBox(imageRef.current, canvasFab.current, rotation, [box]);


  useEffect(() => {

    let canvas = new fabric.Canvas("main-canvas");
    canvas.setDimensions({ width: containerRef.current ?.offsetWidth || 1000, height: containerRef.current ?.offsetHeight || 1000 });
    canvasFab.current = canvas;
  }, [])
  useEffect(() => {
    console.log('boxes here')
    // canvasFab.current.getObjects() = props.boxes;
    detachListeners();
    imageSource.current = props.src;
    imageRef.current = imageSrcMap.current[props.src];
    canvasFab.current.remove(...canvasFab.current.getObjects());
    if (imageRef.current) {
      let imgValues = getCenterCoords(imageRef.current);
      rotationRef.current = imgValues.angle;

    } else {
      rotationRef.current = 0;
    }
    canvasFab.current.renderAll();
    drawBoxes(props.boxes);
  }, [props.src]);

  useEffect(() => {
    // canvasFab.current.getObjects() = props.boxes;
  }, [props.boxes]);
  // }
  useEffect(() => {
    // imageSource.current = props.src;
    if (imageRef.current) {

      canvasFab.current.setBackgroundImage(imageRef.current);
      // drawBoxes(canvasFab.current.getObjects());
      attachListeners();
      canvasFab.current.renderAll();
    } else {
      fabric.Image.fromURL(imageSource.current, (img: any) => {
        img.set('objectCaching', false);
        // let {left = 0, top = 0} = imageRef.current || {};
        let dimensions: any = getImageDimensions(img, canvasFab.current.getElement());
        imageRef.current = img;
        imageSrcMap.current[imageSource.current] = img;
        img.scaleToWidth(dimensions.width);
        img.scaleToHeight(dimensions.height);
        canvasFab.current.setBackgroundImage(img);
        canvasFab.current.renderAll();
        let imgValues = getCenterCoords(img);
        console.log('imgValues', imgValues);

        performCanvasPaint(img, canvasFab.current, canvasRef.current, rotation);
        setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
      },
        { selectable: false, hasRotatingPoint: false, lockScalingX: true, lockScalingY: true }
      );
    }
  }, [imageSource.current])




  useEffect(() => {
    console.log('rotation called', rotationRef.current);
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
    if (isReset.current) {
      let imgValues = getCenterCoords(imageRef.current);
      imageRef.current.set({ left: 0, top: 0 });
      let newImgValues = getCenterCoords(imageRef.current);
      console.log(imgValues, newImgValues);
      const diffx = -1 * (imgValues.translateX - newImgValues.translateX);
      const diffy = -1 * (imgValues.translateY - newImgValues.translateY);

      [...canvasFab.current.getObjects()].map((rect) => {
        const translateX = rect.left + diffx;
        const translateY = rect.top + diffy;
        rect.set({ left: translateX, top: translateY });
        rect.setCoords();
        return;
      });
      canvasFab.current.renderAll();
      isReset.current = false;
    }
    setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));

  }, [rotation, isReset.current])

  useEffect(() => {
    if (cursorMode == 'pan') {
      canvasFab.current.set({ selection: false })
    } else {
      canvasFab.current.set({ selection: true })
    }

    attachListeners();
    return () => {
      detachListeners();
    }
  }, [cursorMode])
  const attachListeners = () => {
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
      handleCrop('resize', e.target);
    })
    canvasFab.current.on("object:removed", (e: any) => {
      console.log(' delete event', e);
      imageMapRef.current[e.target.id] = undefined;
      const boxId = e.target.id;
      const currentImgParam: CurrentImgParam = boxId
        ? {
          boxId,
          dataUrl: imageMapRef.current[boxId],
        }
        : undefined;


      onChange ?.(
        { type: 'delete', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        canvasFab.current.getObjects(),
      );
      props.onCrop ?.({ type: 'delete' }, imageMapRef.current, currentImgParam);
      isDrawing.current = false;
    })
    canvasFab.current.on('mouse:wheel', function(opt: any) {
      const deltaY = opt.e.deltaY;
      const deltaX = opt.e.deltaX;
      console.log(deltaY, deltaX);
      [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

        const translateX = rect.left + deltaX;
        const translateY = rect.top + deltaY;
        rect.set({ left: translateX,top: translateY });
        rect.setCoords();
        return;
      })
      setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
      
      canvasFab.current.renderAll()
    })
  }
  const detachListeners = () => {
    canvasFab.current.off('mouse:down');
    canvasFab.current.off('mouse:move');
    canvasFab.current.off('mouse:up');

    canvasFab.current.off("object:modified");
    canvasFab.current.off("object:removed");
  }
  useEffect(() => {
    let { zoom = 0 } = props;
    console.log('zoom', zoom, props.zoom);
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    if (imageRef.current) {
      let imgValues = getCenterCoords(imageRef.current);
      console.log('zoom,', imgValues, canvasFab.current.getWidth(), canvasFab.current.getHeight());
      canvasFab.current.zoomToPoint({ x: imgValues.translateX, y: imgValues.translateY }, zoom);
    }
    setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
  }, [props.zoom])



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

  const handleAllCrops = (boxes: any) => {
    const imageMap = getCroppedImageFromBox(imageRef.current, canvasFab.current, rotation, boxes);
    imageMapRef.current = imageMap;
    props.onCrop ?.({ type: 'draw' }, imageMapRef.current);
  }


  const handleMouseDown = (e: MouseEvent) => {
    if (cursorMode === 'pan') {
      pointA.current = canvasFab.current.getPointer(e);
      setIsPanning(true);
    } else
      if (cursorMode === 'draw') {
        pointA.current = canvasFab.current.getPointer(e);
        drawingIndex.current = canvasFab.current.getObjects().length;
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
        rect.setCoords();
        return;
      })


      canvasFab.current.renderAll();
      pointA.current = pointB;
      setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));

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
      // const nextBoxes = [...boxes, lastUpdatedBox.current];
      onChange ?.(
        { type: 'draw', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        canvasFab.current.getObjects(),
      );
    }
  };
  const handleMouseUp = (e: MouseEvent) => {
    if (cursorMode === 'pan') {
      onChange ?.(
        { type: 'draw', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        canvasFab.current.getObjects(),
      );
    } else if (cursorMode === 'draw') {
      if (!isDrawing.current) return;
      if (!lastUpdatedBox.current) return;


      isDrawing.current = false;
      console.log('mousup', e);

      handleCrop('draw-end', lastUpdatedBox.current);
      canvasFab.current.discardActiveObject();
      canvasFab.current.renderAll();
    }
    pointA.current = {};
  };
  const handleReset = () => {

    isReset.current = true;
    props ?.onReset();

    canvasFab.current.renderAll();
  }

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
        onScroll={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Hello');
        }}
      >
        <button

          onClick={handleReset}
        >
          Reset
      </button>
        <canvas
          className={[
            cursorMode === 'pan' ? css.pan : '',
            isPanning ? css.panning : '',
            props.containerClassName || '',
          ].join(' ')}
          ref={mainCanvasRef} id="main-canvas" style={{ width: '100%', height: '100%' }} ></canvas>
        <Scrollbar
          type={'horizontal'}
          style={{
            left: `calc(${scrollPositions.wl}% + ${scrollbarSpacing}px)`,
            right: `calc(${scrollPositions.wr}% + ${scrollbarSpacing}px)`,
          }}
          // isHidden={!wl && !wr}
          onScroll={(diff: number) => {
            // setStaticPanCoords({
            //   ...staticPanCoords,
            //   x: staticPanCoords.x + diff * pxScaleH,
            // })
            [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

              const translateX = rect.left + diff;
              rect.set({ left: translateX });
              rect.setCoords();
              return;
            }
            )
            setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
            // setScrollPositions({ wl, wr, ht, hb });
            canvasFab.current.renderAll()
          }
          }
        />
        <Scrollbar
          type={'vertical'}
          style={{
            top: `calc(${scrollPositions.ht}% + ${scrollbarSpacing}px)`,
            bottom: `calc(${scrollPositions.hb}% + ${scrollbarSpacing}px)`,
          }}
          // isHidden={!ht && !hb}
          onScroll={(diff: number) => {
            // setStaticPanCoords({
            //   ...staticPanCoords,
            //   y: staticPanCoords.y + diff * pxScaleW,
            // })
            console.log(diff);
            [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

              // const translateX = rect.left + xDiff;
              const translateY = rect.top + diff;
              rect.set({ top: translateY });
              rect.setCoords();
              return;
            })
            setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
            
            canvasFab.current.renderAll()

          }
            // console.log(diff)
          }
        />

      </div>
      <canvas id="canvas-fab" className={css.canvas} ref={canvasRef} />
    </>
  );
};

export default MultiCrops;



