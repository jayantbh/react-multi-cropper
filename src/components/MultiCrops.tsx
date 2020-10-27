import React, { FC, MouseEvent, useRef, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { fabric } from 'fabric';
import { IControlActionHandlerFunction, IEvent } from 'fabric/fabric-impl';

import css from './MultiCrops.module.scss';
import cross from '../cross.svg';
import {
  Coordinates,
  // CropperBox,
  CropperEvent,
  CropperProps,
  CurrentImgParam,
  MapOf,
} from '../types';
import {
  getCroppedImageFromBox,
  performCanvasPaint,
  useScrollbars,
  useZoom,
  useRotation,
  useWheelEvent,
  resetToCenter,
  usePrevious,
  // usePrevious,
  // useCursor
} from './MultiCrops.helpers';
import Scrollbar from './Scrollbar';
const scrollbarSpacing = 6;

import { fabricRectToCropperBox, getImageDimensions } from '../utils';
import { Box, BoxType } from './Box';
const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};
import '../fabric.d.ts';
import { equals } from 'ramda';
// import { difference, equals } from 'ramda';

const img = document.createElement('img');
img.src = cross;
const renderIcon = function (
  this: fabric.Rect,
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  obj: fabric.Object
) {
  const size = this.cornerSize || 1;
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(fabric.util.degreesToRadians(obj.angle || 0));
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
};

const deleteObject: IControlActionHandlerFunction = (eventData, target) => {
  console.log(eventData);
  const { canvas } = target;
  if (!canvas) return false;

  target.manualDeletion = true;
  canvas.remove(target);
  canvas.requestRenderAll();
  return true;
};

fabric.Object.prototype.cornerColor = 'blue';
fabric.Object.prototype.cornerStyle = 'circle';
fabric.Object.prototype.controls;
fabric.Object.prototype.controls.tr = new fabric.Control({
  x: 0.5,
  y: -0.5,
  offsetY: 0,
  cursorStyle: 'pointer',
  mouseUpHandler: deleteObject,
  render: renderIcon,
  cornerSize: 24,
});
fabric.Object.prototype.cornerSize = 8;
fabric.Object.prototype.transparentCorners = false;

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  zoom = 1,
  disableKeyboard = false,
  disableMouse,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pointA = useRef<Partial<Coordinates>>(blankCoords);
  const id = useRef<string>(uuid());
  const drawingIndex = useRef(-1);
  const lastUpdatedBox = useRef<any>(null);
  const isDrawing = useRef<boolean>(false);
  const mainCanvasRef = useRef<any>(null);
  const imageSrcMap = useRef<any>({});
  const [isPanning, setIsPanning] = useState(false);
  let canvasFab = useRef<fabric.Canvas | null>(null);
  const rotationRef = useRef<any>(rotation);
  const panFrame = useRef(-1);
  const wheelFrame = useRef(-1);
  const keyFrame = useRef(-1);
  const drawMode = useRef<any>({
    cursorMode,
    disableKeyboard,
    disableMouse,
  });
  const imageMapRef = useRef<any>({});
  const imageSource = useRef<any>(props.src);
  const isReset = useRef<any>(false);

  const [scrollPositions, setScrollPositions] = useState<any>(
    useScrollbars(canvasFab.current, imageRef.current)
  );

  const drawBoxes = (boxes: BoxType[]) => {
    const fab = canvasFab.current;
    if (!fab) return;

    fab.remove(...fab.getObjects());
    fab.add(...boxes.map((box) => new Box(box)));

    canvasFab.current?.renderAll();
  };

  const getSelections = (box: typeof Box) =>
    getCroppedImageFromBox(imageRef.current, canvasFab.current, box);

  // fabricjs  mouse event listeners
  const attachListeners = () => {
    canvasFab.current?.on('mouse:down', (e: any) => {
      if (e.target?.type !== 'rect') handleMouseDown(e);
    });
    canvasFab.current?.on('mouse:move', (e: any) => {
      handleMouseMove(e);
    });
    canvasFab.current?.on('mouse:up', (e: any) => {
      handleMouseUp(e);
    });
    canvasFab.current?.on('object:removed', (e: IEvent) => {
      if (!e.target?.manualDeletion) return;

      imageMapRef.current[e.target?.id ?? ''] = undefined;
      console.log(e);

      onChange?.(
        { type: 'delete', event: e.e },
        lastUpdatedBox.current,
        drawingIndex.current,
        (canvasFab.current?.getObjects() as BoxType[]).map(
          fabricRectToCropperBox
        )
      );
      isDrawing.current = false;
    });
  };
  const detachListeners = () => {
    canvasFab.current?.off('mouse:down');
    canvasFab.current?.off('mouse:move');
    canvasFab.current?.off('mouse:up');
    canvasFab.current?.off('object:modified');
    canvasFab.current?.off('object:removed');
    canvasFab.current?.off('mouse:wheel');
  };
  // init canvas
  useEffect(() => {
    let canvas = new fabric.Canvas('main-canvas');
    canvas.setDimensions({
      width: containerRef.current?.offsetWidth || 1000,
      height: containerRef.current?.offsetHeight || 1000,
    });
    canvas.selection = false;
    canvasFab.current = canvas;
    canvas.backgroundColor = '';
    canvasFab.current?.requestRenderAll();
  }, []);

  // change image src
  useEffect(() => {
    console.log('src changed');
    detachListeners();
    imageSource.current = props.src;
    imageRef.current = imageSrcMap.current[props.src];
    canvasFab.current?.remove(...canvasFab.current?.getObjects());
    rotationRef.current = 0;

    // canvasFab.current?.requestRenderAll();
    drawBoxes(props.boxes);
  }, [props.src]);

  // load image on src change
  useEffect(() => {
    if (!canvasFab.current || !containerRef.current) return;
    if (imageRef.current) {
      canvasFab.current?.setBackgroundImage(imageRef.current, () => {});
      attachListeners();
      canvasFab.current?.requestRenderAll();
      resetToCenter(imageRef.current, canvasFab.current, containerRef.current);
    } else {
      fabric.Image.fromURL(
        imageSource.current,
        (img: any) => {
          if (!canvasFab.current) return;
          img.set('objectCaching', false);
          let dimensions: any = getImageDimensions(
            img,
            canvasFab.current?.getElement()
          );
          let x = (canvasFab.current?.getWidth() - dimensions.width) / 2;
          let y = (canvasFab.current?.getHeight() - dimensions.height) / 2;
          imageRef.current = img;
          imageSrcMap.current[imageSource.current] = img;
          img.scaleToWidth(dimensions.width);
          img.scaleToHeight(dimensions.height);
          img.set('left', x);
          img.set('top', y);
          canvasFab.current?.setBackgroundImage(img, () => {});
          canvasFab.current?.requestRenderAll();
          attachListeners();
          performCanvasPaint(
            img,
            canvasFab.current,
            canvasRef.current,
            rotation
          );
          setScrollPositions(
            useScrollbars(canvasFab.current, imageRef.current)
          );
        },
        {
          selectable: false,
          hasRotatingPoint: false,
          lockScalingX: true,
          lockScalingY: true,
        }
      );
    }
  }, [imageSource.current]);

  const prevBoxes = usePrevious(props.boxes);
  useEffect(() => {
    const boxesChanged = !equals(prevBoxes, props.boxes);
    console.log('Boxes changed?', boxesChanged, props.boxes);
    boxesChanged && drawBoxes(props.boxes);
  }, [prevBoxes, props.boxes]);

  const drawBoxesRef = useRef(() => drawBoxes(props.boxes));
  drawBoxesRef.current = () => drawBoxes(props.boxes);
  // reset functionality
  useEffect(() => {
    const cb = () => {
      isReset.current = true;
      drawBoxesRef.current();
      canvasFab.current &&
        containerRef.current &&
        resetToCenter(
          imageRef.current,
          canvasFab.current,
          containerRef.current,
          true
        );

      canvasFab.current?.requestRenderAll();
    };
    props.onLoad?.(imageMapRef.current, cb);
  }, []);

  // rotation
  useRotation(
    props.src,
    imageRef.current,
    canvasFab.current,
    canvasRef.current,
    // containerRef.current,
    rotation,
    rotationRef,
    isReset
  );
  // cursor changed from draw to zoom
  useEffect(() => {
    if (!canvasFab.current) return;
    if (cursorMode == 'select') {
      canvasFab.current.selection = true;
    } else {
      canvasFab.current.selection = false;
    }

    drawMode.current = {
      cursorMode,
      disableKeyboard,
      disableMouse,
    };
  }, [cursorMode, disableKeyboard, disableMouse]);

  // zoom changed
  useZoom(imageRef.current, canvasFab.current, zoom, setScrollPositions);

  const handleCrop = (type: CropperEvent['type'], box: typeof Box) => {
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

    props.onCrop?.(
      { type },
      imageMapRef.current,
      currentImgParam,
      fabricRectToCropperBox(box)
    );

    isDrawing.current = false;
  };

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const handleMouseDown = (e: MouseEvent) => {
    if (!canvasFab.current) return;

    console.log(zoom, zoomRef.current, 2 / zoomRef.current);
    const { cursorMode } = drawMode.current;
    if (cursorMode === 'pan') {
      pointA.current = canvasFab.current?.getPointer((e as unknown) as Event);
      setIsPanning(true);
    } else if (cursorMode === 'draw') {
      canvasFab.current.selection = false;
      pointA.current = canvasFab.current?.getPointer((e as unknown) as Event);
      drawingIndex.current = canvasFab.current?.getObjects().length;
      id.current = uuid();
      isDrawing.current = true;

      let rect = new Box({
        id: id.current,
        rotation: rotationRef.current,
        top: pointA.current.y,
        left: pointA.current.x,
        // fill: 'rgba(255,255,255,0.2)',
        // hasBorders: false,
        // stroke: 'black',
        strokeWidth: 2 / zoomRef.current,
        // hasRotatingPoint: false,
        // strokeUniform: true,
        // objectCaching: false,
      });
      canvasFab.current?.add(rect);
      lastUpdatedBox.current = rect;

      canvasFab.current?.requestRenderAll();
    }
  };
  const handleMouseMove = (e: MouseEvent) => {
    const { cursorMode } = drawMode.current;
    const pointB = canvasFab.current?.getPointer(
      (e as unknown) as Event
    ) as Coordinates;
    if (cursorMode === 'pan') {
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;

      let intialPoint: any = pointA.current;
      const xDiff = -1 * (intialPoint.x - pointB.x);
      const yDiff = -1 * (intialPoint.y - pointB.y);
      cancelAnimationFrame(panFrame.current);
      panFrame.current = requestAnimationFrame(() =>
        [imageRef.current, ...(canvasFab.current?.getObjects() || [])].map(
          (rect) => {
            const translateX = rect.left + xDiff;
            const translateY = rect.top + yDiff;
            rect.set({ left: translateX, top: translateY });
            rect.setCoords();
            return;
          }
        )
      );

      canvasFab.current?.requestRenderAll();
      pointA.current = pointB;
      setScrollPositions(useScrollbars(canvasFab.current, imageRef.current));
    } else if (cursorMode === 'draw') {
      if (!isDrawing.current) return;
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;

      let rect = lastUpdatedBox.current;
      rect.set({
        left: Math.min(pointA.current.x, pointB.x),
        top: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
      });
      canvasFab.current?.requestRenderAll();
      lastUpdatedBox.current = rect;
      // const nextBoxes = [...boxes, lastUpdatedBox.current];
      // onChange?.(
      //   { type: 'draw', event: e },
      //   lastUpdatedBox.current,
      //   drawingIndex.current,
      //   ((canvasFab.current?.getObjects() || []) as unknown) as CropperBox[]
      // );
    }
  };
  const handleMouseUp = (e: MouseEvent) => {
    const fab = canvasFab.current;
    if (!fab) return;

    const { cursorMode } = drawMode.current;
    if (cursorMode === 'pan') {
      // do nothing
    } else if (cursorMode === 'draw') {
      fab.selection = true;
      if (!isDrawing.current) return;
      isDrawing.current = false;

      const box = lastUpdatedBox.current;
      if (box?.height < 10 && box?.width < 10) {
        fab.remove(box);
      } else {
        fab.setActiveObject(box);
        handleCrop('draw-end', box);
      }

      fab.requestRenderAll();
    } else if (cursorMode === 'select') {
      const selection = (fab.getActiveObjects() as unknown) as BoxType[];
      if (!selection.length) return;
      const groupRects = (map: MapOf<BoxType>, box: BoxType) => ({
        ...map,
        [box.id]: box,
      });
      props.onSelect?.(
        selection.map(fabricRectToCropperBox).reduce(groupRects, {})
      );
      fab.discardActiveObject((e as unknown) as Event);
    }
    pointA.current = {};
  };
  const onChange: CropperProps['onChange'] = (e, box, index, boxes) => {
    lastUpdatedBox.current = box;

    props.onChange?.(e, box, index, boxes);
  };

  useWheelEvent(
    containerRef,
    (e: WheelEvent) => {
      const { disableMouse } = drawMode.current;
      if (disableMouse.zoom || disableMouse.all) return;
      e.preventDefault();
      e.stopPropagation();
      let shiftKey = e.shiftKey;
      const deltaY = e.deltaY;
      const deltaX = e.deltaX;
      if (shiftKey) {
        let zoom = canvasFab.current?.getZoom() || 1;
        props.onZoomGesture?.(zoom + deltaY * 0.01, zoom);
      } else {
        cancelAnimationFrame(wheelFrame.current);
        wheelFrame.current = requestAnimationFrame(() => {
          [imageRef.current, ...(canvasFab.current?.getObjects() || [])].map(
            (rect) => {
              const translateX = rect.left - deltaX;
              const translateY = rect.top - deltaY;
              rect.set({ left: translateX, top: translateY });
              rect.setCoords();
              return;
            }
          );
          setScrollPositions(
            useScrollbars(canvasFab.current, imageRef.current)
          );

          canvasFab.current?.requestRenderAll();
        });
      }
    },
    [props.onZoomGesture, zoom, disableMouse]
  );

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

          const { key, shiftKey } = e;

          if (key.startsWith('Arrow')) {
            e.preventDefault();
            e.stopPropagation();
          }
          cancelAnimationFrame(keyFrame.current);
          keyFrame.current = requestAnimationFrame(() => {
            if (shiftKey) {
              const delta =
                key === 'ArrowRight' || key === 'ArrowUp'
                  ? 0.05
                  : key === 'ArrowLeft' || key === 'ArrowDown'
                  ? -0.05
                  : 0;
              props.onZoomGesture?.(zoom + delta, zoom);
            } else {
              const deltaX =
                key === 'ArrowRight' ? 10 : key === 'ArrowLeft' ? -10 : 0;
              const deltaY =
                key === 'ArrowDown' ? 10 : key === 'ArrowUp' ? -10 : 0;
              [
                imageRef.current,
                ...(canvasFab.current?.getObjects() || []),
              ].map((rect) => {
                const translateX = rect.left + deltaX;
                const translateY = rect.top + deltaY;
                rect.set({ left: translateX, top: translateY });
                rect.setCoords();
                return;
              });
              setScrollPositions(
                useScrollbars(canvasFab.current, imageRef.current)
              );

              canvasFab.current?.requestRenderAll();
            }
          });
        }}
      >
        <canvas
          className={[
            cursorMode === 'pan' ? css.pan : '',
            isPanning ? css.panning : '',
            props.containerClassName || '',
          ].join(' ')}
          ref={mainCanvasRef}
          id='main-canvas'
          style={{ width: '100%', height: '100%' }}
        />
        <Scrollbar
          type={'horizontal'}
          style={{
            left: `calc(${scrollPositions.wl}% + ${scrollbarSpacing}px)`,
            right: `calc(${scrollPositions.wr}% + ${scrollbarSpacing}px)`,
          }}
          isHidden={!scrollPositions.wl && !scrollPositions.wr}
          onScroll={(diff: number) => {
            [imageRef.current, ...(canvasFab.current?.getObjects() || [])].map(
              (rect) => {
                const translateX = rect.left + diff;
                rect.set({ left: translateX });
                rect.setCoords();
                return;
              }
            );
            setScrollPositions(
              useScrollbars(canvasFab.current, imageRef.current)
            );
            canvasFab.current?.requestRenderAll();
          }}
        />
        <Scrollbar
          type={'vertical'}
          style={{
            top: `calc(${scrollPositions.ht}% + ${scrollbarSpacing}px)`,
            bottom: `calc(${scrollPositions.hb}% + ${scrollbarSpacing}px)`,
          }}
          isHidden={!scrollPositions.ht && !scrollPositions.hb}
          onScroll={(diff: number) => {
            [imageRef.current, ...(canvasFab.current?.getObjects() || [])].map(
              (rect) => {
                const translateY = rect.top + diff;
                rect.set({ top: translateY });
                rect.setCoords();
                return;
              }
            );
            setScrollPositions(
              useScrollbars(canvasFab.current, imageRef.current)
            );

            canvasFab.current?.requestRenderAll();
          }}
        />
      </div>
      <canvas id='canvas-fab' className={css.canvas} ref={canvasRef} />
    </>
  );
};

export default MultiCrops;
