import React, { FC, MouseEvent, useRef, useState } from 'react';
import sid from 'shortid';
import useResizeObserver from 'use-resize-observer';

import Crop from './Crop';
import css from './MultiCrops.module.scss';
import {
  Coordinates,
  CropperBox,
  CropperEvent,
  CropperProps,
  CurrentImgParam,
  RefSize,
} from '../types';
import {
  getAbsoluteCursorPosition,
  getCursorPosition,
  getImageMapFromBoxes,
  onImageLoad,
  onImageResize,
  performCanvasPaint,
  useCentering,
  usePropResize,
  usePropRotation,
} from './MultiCrops.helpers';

const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pointA = useRef<Partial<Coordinates>>(blankCoords);
  const id = useRef<string>(sid.generate());
  const drawingIndex = useRef(-1);
  const prevSize = useRef<RefSize | undefined>(undefined);
  const lastUpdatedBox = useRef<CropperBox | undefined>(undefined);
  const isDrawing = useRef<boolean>(false);

  const panFrame = useRef(-1);
  const autoSizeTimeout = useRef(-1);

  const [isPanning, setIsPanning] = useState(false);
  const [staticPanCoords, setStaticPanCoords] = useState({ x: 0, y: 0 });
  const [activePanCoords, setActivePanCoords] = useState({ x: 0, y: 0 });

  const [centerCoords, setCenterCoords] = useCentering(
    imageRef.current,
    containerRef.current,
    staticPanCoords,
    activePanCoords
  );

  const drawCanvas = () =>
    performCanvasPaint(
      imageRef.current,
      containerRef.current,
      canvasRef.current,
      staticPanCoords,
      activePanCoords,
      rotation
    );

  const getSelections = (boxes: CropperProps['boxes'] = props.boxes) =>
    getImageMapFromBoxes(boxes, containerRef.current, canvasRef.current);

  usePropResize(
    props.width,
    props.height,
    props.onCrop,
    drawCanvas,
    getSelections
  );

  usePropRotation(
    rotation,
    props.boxes,
    props.onChange,
    props.onCrop,
    drawCanvas,
    getSelections
  );

  useResizeObserver({
    ref: imageRef,
    onResize: onImageResize(
      imageRef.current,
      containerRef.current,
      canvasRef.current,
      prevSize,
      autoSizeTimeout,
      setCenterCoords,
      staticPanCoords,
      activePanCoords,
      rotation,
      props.src,
      props.boxes,
      props.onChange,
      props.onCrop
    ),
  });

  const onLoad = onImageLoad(
    prevSize,
    lastUpdatedBox,
    props.onLoad,
    drawCanvas,
    getSelections
  );

  const handleCrop = (e: CropperEvent['event'], type: CropperEvent['type']) => {
    drawCanvas();
    const selections = getSelections();
    const boxId = lastUpdatedBox.current?.id;
    const currentImgParam: CurrentImgParam = boxId
      ? {
          boxId,
          dataUrl: selections[boxId],
        }
      : undefined;

    props.onCrop?.({ type, event: e }, selections, currentImgParam);

    isDrawing.current = false;
  };

  const handleMouseDown = (e: MouseEvent) => {
    const isTargetInCropper =
      e.target === imageRef.current || e.target === containerRef.current;
    if (!isTargetInCropper) return;

    if (cursorMode === 'pan') {
      pointA.current = getAbsoluteCursorPosition(e);
      setIsPanning(true);
      setStaticPanCoords({
        x: staticPanCoords.x + activePanCoords.x,
        y: staticPanCoords.y + activePanCoords.y,
      });
      setActivePanCoords({ x: 0, y: 0 });
    } else if (cursorMode === 'draw') {
      pointA.current = getCursorPosition(e, containerRef.current, centerCoords);
      drawingIndex.current = props.boxes.length;
      id.current = sid.generate();
      isDrawing.current = true;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const { onChange, boxes } = props;

    if (cursorMode === 'pan' && isPanning) {
      const pointB = getAbsoluteCursorPosition(e);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
      const xDiff = -1 * (pointA.current.x - pointB.x);
      const yDiff = -1 * (pointA.current.y - pointB.y);

      cancelAnimationFrame(panFrame.current);
      panFrame.current = requestAnimationFrame(() =>
        setActivePanCoords({
          x: xDiff,
          y: yDiff,
        })
      );
    } else if (cursorMode === 'draw') {
      const pointB = getCursorPosition(e, containerRef.current, centerCoords);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
      const box = {
        x: Math.min(pointA.current.x, pointB.x),
        y: Math.min(pointA.current.y, pointB.y),
        originX: Math.min(pointA.current.x, pointB.x),
        originY: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
        id: id.current,
        rotation: 0,
      };
      const nextBoxes = [...boxes];
      nextBoxes[drawingIndex.current] = box;
      lastUpdatedBox.current = box;
      onChange?.(
        { type: 'draw', event: e },
        box,
        drawingIndex.current,
        nextBoxes
      );
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLImageElement>) => {
    if (cursorMode === 'pan') {
      cancelAnimationFrame(panFrame.current);
      setIsPanning(false);
      setStaticPanCoords({
        x: staticPanCoords.x + activePanCoords.x,
        y: staticPanCoords.y + activePanCoords.y,
      });
      setActivePanCoords({ x: 0, y: 0 });
      drawCanvas();
      handleCrop(e, 'pan');
    } else if (cursorMode === 'draw') {
      if (!isDrawing.current) return;

      handleCrop(e, 'draw-end');
      isDrawing.current = false;
    }
    pointA.current = {};
  };

  const onChange: CropperProps['onChange'] = (e, box, index, boxes) => {
    lastUpdatedBox.current = box;
    props.onChange?.(e, box, index, boxes);
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={containerRef}
        draggable={false}
      >
        <img
          ref={imageRef}
          src={props.src}
          width={props.width}
          height={props.height}
          onLoad={onLoad}
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
        />
        <div
          style={{
            height: 0,
            width: 0,
            position: 'absolute',
            top: `${centerCoords.y}px`,
            left: `${centerCoords.x}px`,
          }}
        >
          {props.boxes.map((box, index) => (
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
          ))}
        </div>
      </div>
      <canvas ref={canvasRef} className={css.canvas} />
    </>
  );
};

export default MultiCrops;
