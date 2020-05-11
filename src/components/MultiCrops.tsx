import React, { FC, MouseEvent, useRef, useEffect, useState } from 'react';
import sid from 'shortid';
import { fabric } from 'fabric';
// import * as controls from 'fabric-customise-controls';
import css from './MultiCrops.module.scss';
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
  useScrollbars,
  useZoom,
  useRotation,
  // useCursor
} from './MultiCrops.helpers';
import Scrollbar from './Scrollbar';
const scrollbarSpacing = 6;;

import { getCenterCoords, getImageDimensions } from '../utils';
const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};
let object: any = fabric.Object;

var img = document.createElement('img');
img.src = cross;
const renderIcon = function (this: any, ctx: any, left: any, top: any, fabricObject: any) {
  var size = (this as any).cornerSize;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

fabric.Object.prototype.cornerColor = 'blue';
fabric.Object.prototype.cornerStyle = 'circle';
object.prototype.controls.deleteControl = new (fabric as any).Control({
  position: { x: 0.5, y: -0.5 },
  offsetY: 0,
  cursorStyle: 'pointer',
  mouseUpHandler: deleteObject,
  render: renderIcon,
  cornerSize: 24
});
fabric.Object.prototype.cornerSize = 8;
fabric.Object.prototype.transparentCorners = false;
function deleteObject(eventData: any, target: any) {
  console.log(eventData);
  var canvas = target.canvas;
  canvas.remove(target);
  canvas.requestRenderAll();
}

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  zoom = 1,
  modifiable = true,
  disableKeyboard = false,
  disableMouse = false,
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
  const panFrame = useRef(-1);
  const wheelFrame = useRef(-1);
  const keyFrame = useRef(-1);
  const drawMode = useRef<any>({ cursorMode, modifiable, disableKeyboard, disableMouse })
  const imageMapRef = useRef<any>({});
  const imageSource = useRef<any>(props.src);
  const isReset = useRef<any>(false);

  const [scrollPositions, setScrollPositions] = useState<any>(useScrollbars(
    canvasFab.current,
    imageRef.current,
  ));



  const drawBoxes = (boxes: any) => {
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
    getCroppedImageFromBox(imageRef.current, canvasFab.current, [box]);


  // fabricjs  mouse event listeners
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
      handleCrop('resize', e.target);
    })
    canvasFab.current.on("object:removed", (e: any) => {
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
    canvasFab.current.on('mouse:wheel', function (opt: any) {
      const { disableMouse } = drawMode.current;
      if (disableMouse) return;
      opt.e.preventDefault();
      opt.e.stopPropagation();
      let shiftKey = opt.e.shiftKey;
      const deltaY = opt.e.deltaY;
      const deltaX = opt.e.deltaX;
      if (shiftKey) {
        let zoom = canvasFab.current.getZoom();
        props.onZoomGesture ?.(zoom + deltaY * 0.01);
      } else {
        cancelAnimationFrame(wheelFrame.current)
        wheelFrame.current = requestAnimationFrame(() => {
          [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

            const translateX = rect.left - deltaX;
            const translateY = rect.top - deltaY;
            rect.set({ left: translateX, top: translateY });
            rect.setCoords();
            return;
          })
          setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));

          canvasFab.current.renderAll()
        }
        )
      }
    })
  }
  const detachListeners = () => {
    canvasFab.current.off('mouse:down');
    canvasFab.current.off('mouse:move');
    canvasFab.current.off('mouse:up');
    canvasFab.current.off("object:modified");
    canvasFab.current.off("object:removed");
    canvasFab.current.off('mouse:wheel');
  }
// init canvas 
  useEffect(() => {

    let canvas = new fabric.Canvas("main-canvas");
    canvas.setDimensions({ width: containerRef.current ?.offsetWidth || 1000, height: containerRef.current ?.offsetHeight || 1000 });
    canvasFab.current = canvas;
    canvas.backgroundColor = '';
    canvasFab.current.renderAll();
  }, [])

  // change image src 
  useEffect(() => {
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

  // load image on src change
  useEffect(() => {
    if (imageRef.current) {
      canvasFab.current.setBackgroundImage(imageRef.current);
      attachListeners();
      canvasFab.current.renderAll();
    } else {
      fabric.Image.fromURL(imageSource.current, (img: any) => {
        img.set('objectCaching', false);
        let dimensions: any = getImageDimensions(img, canvasFab.current.getElement());
        let x = (canvasFab.current.getWidth() - dimensions.width) / 2;
        let y = (canvasFab.current.getHeight() - dimensions.height) / 2;
        imageRef.current = img;
        imageSrcMap.current[imageSource.current] = img;
        img.scaleToWidth(dimensions.width);
        img.scaleToHeight(dimensions.height);
        img.set('left', x);
        img.set('top', y);
        canvasFab.current.setBackgroundImage(img);
        canvasFab.current.renderAll();
        attachListeners();
        performCanvasPaint(img, canvasFab.current, canvasRef.current, rotation);
        setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
      },
        { selectable: false, hasRotatingPoint: false, lockScalingX: true, lockScalingY: true }
      );
    }

  }, [imageSource.current])


  // reset functionality
  useEffect(() => {
    const cb = () => {
      isReset.current = true;
    }
    props.onLoad ?.(imageMapRef.current, cb);
  }, []);


  // rotation
  useRotation(
    imageRef.current,
    canvasFab.current,
    containerRef.current,
    rotation,
    rotationRef,
    isReset
  );
  // cursor changed from draw to zoom
  useEffect(() => {
    if (cursorMode == 'pan') {
      canvasFab.current.set({ selection: false })
    } else {
      canvasFab.current.set({ selection: true })
    }
    drawMode.current = { cursorMode, modifiable, disableKeyboard, disableMouse };
  }, [cursorMode, modifiable, disableKeyboard, disableMouse])

  // zoom changed
  useZoom(
    imageRef.current,
    canvasFab.current,
    zoom,
    setScrollPositions
  )

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
    const imageMap = getCroppedImageFromBox(imageRef.current, canvasFab.current, boxes);
    imageMapRef.current = imageMap;
    props.onCrop ?.({ type: 'draw' }, imageMapRef.current);
  }


  const handleMouseDown = (e: MouseEvent) => {
    const { cursorMode, modifiable } = drawMode.current;
    if (cursorMode === 'pan') {
      pointA.current = canvasFab.current.getPointer(e);
      setIsPanning(true);
    } else
      if (cursorMode === 'draw') {
        canvasFab.current.selection = false;
        pointA.current = canvasFab.current.getPointer(e);
        drawingIndex.current = canvasFab.current.getObjects().length;
        id.current = sid.generate();
        isDrawing.current = true;
        let rect: CustomRect = new CustomRect(id.current, rotationRef.current,
          {
            top: pointA.current.y,
            left: pointA.current.x,
            fill: 'rgba(255,255,255,0.2)',
            hasBorders: false,
            stroke: 'black',
            strokeWidth: 2,
            hasRotatingPoint: false,
            strokeUniform: true,
            lockMovementX: !modifiable,
            lockMovementY: !modifiable,
            lockScalingX: !modifiable,
            lockScalingY: !modifiable,
            objectCaching: false,
          }
        )
        rect.setControlsVisibility({ tl: modifiable, bl: modifiable, br: modifiable, mb: modifiable, ml: modifiable, mt: modifiable, mr: modifiable, mtr: false, tr: false });
        canvasFab.current ?.add(rect);
        lastUpdatedBox.current = rect;

        canvasFab.current ?.renderAll();
      }
  };
  const handleMouseMove = (e: MouseEvent) => {
    const { cursorMode } = drawMode.current;
    if (cursorMode === 'pan') {
      const pointB = canvasFab.current.getPointer(e);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;

      let intialPoint: any = pointA.current;
      const xDiff = -1 * (intialPoint.x - pointB.x);
      const yDiff = -1 * (intialPoint.y - pointB.y);
      cancelAnimationFrame(panFrame.current);
      panFrame.current = requestAnimationFrame(() =>
        [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

          const translateX = rect.left + xDiff;
          const translateY = rect.top + yDiff;
          rect.set({ left: translateX, top: translateY });
          rect.setCoords();
          return;
        })
      );


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
    const { cursorMode } = drawMode.current;
    if (cursorMode === 'pan') {
      cancelAnimationFrame(panFrame.current);
      onChange ?.(
        { type: 'draw', event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        canvasFab.current.getObjects(),
      );
    } else if (cursorMode === 'draw') {
      canvasFab.current.selection = true;
      if (!isDrawing.current) return;
      if (!lastUpdatedBox.current) return;
      isDrawing.current = false;
      handleCrop('draw-end', lastUpdatedBox.current);
      canvasFab.current.renderAll();

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
        onScroll={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (disableKeyboard) return;

          e.preventDefault();
          e.stopPropagation();
          const { key, shiftKey } = e;
          cancelAnimationFrame(keyFrame.current);
          keyFrame.current = requestAnimationFrame(() => {
            if (shiftKey) {
              const delta =
                key === 'ArrowRight' || key === 'ArrowUp'
                  ? 0.05
                  : key === 'ArrowLeft' || key === 'ArrowDown'
                    ? -0.05
                    : 0;
              props.onZoomGesture ?.(zoom + delta);
            } else {
              const deltaX =
                key === 'ArrowRight' ? 10 : key === 'ArrowLeft' ? -10 : 0;
              const deltaY =
                key === 'ArrowDown' ? 10 : key === 'ArrowUp' ? -10 : 0;
              [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

                const translateX = rect.left + deltaX;
                const translateY = rect.top + deltaY;
                rect.set({ left: translateX, top: translateY });
                rect.setCoords();
                return;
              })
              setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));

              canvasFab.current.renderAll()

            }
          }
          )

        }}
      >

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
          isHidden={!scrollPositions.wl && !scrollPositions.wr}
          onScroll={(diff: number) => {
            [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {

              const translateX = rect.left + diff;
              rect.set({ left: translateX });
              rect.setCoords();
              return;
            }
            )
            setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
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
          isHidden={!scrollPositions.ht && !scrollPositions.hb}
          onScroll={(diff: number) => {
            [imageRef.current, ...canvasFab.current.getObjects()].map((rect) => {
              const translateY = rect.top + diff;
              rect.set({ top: translateY });
              rect.setCoords();
              return;
            })
            setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));

            canvasFab.current.renderAll()

          }
          }
        />

      </div>
      <canvas id="canvas-fab" className={css.canvas} ref={canvasRef} />
    </>
  );
};

export default MultiCrops;



