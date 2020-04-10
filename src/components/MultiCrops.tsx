import React, {
  FC,
  MouseEvent,
  ReactEventHandler,
  useEffect,
  useRef,
  useState,
} from 'react';
import sid from 'shortid';
import useResizeObserver from 'use-resize-observer';

import Crop from './Crop';
import css from './MultiCrops.module.scss';
import { imageDataToDataUrl } from '../utils';
import {
  Coordinates,
  CropperBox,
  CropperBoxDataMap,
  CropperEvent,
  CropperProps,
  CurrentImgParam,
  RefSize,
} from '../types';

const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};
const imageDebounceTime = 500;

const dpr = window.devicePixelRatio;

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
  const rotationFrame = useRef(-1);
  const rotationTimeout = useRef(-1);
  const propSizeTimeout = useRef(-1);
  const autoSizeTimeout = useRef(-1);
  const [isPanning, setIsPanning] = useState(false);
  const [centerCoords, setCenterCoords] = useState({ x: 0, y: 0 });
  const [staticPanCoords, setStaticPanCoords] = useState({ x: 0, y: 0 });
  const [activePanCoords, setActivePanCoords] = useState({ x: 0, y: 0 });

  const getImgBoundingRect = (img: HTMLImageElement): DOMRect => {
    const currStyle = img.style.transform;
    img.style.transform = `
      translate(
        ${staticPanCoords.x + activePanCoords.x}px,
        ${staticPanCoords.y + activePanCoords.y}px)
      rotate(0deg)`;
    const rect = img.getBoundingClientRect();
    img.style.transform = currStyle;
    return rect;
  };

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const cont = containerRef.current;

    const imgRect = img.getBoundingClientRect();
    const conRect = cont.getBoundingClientRect();
    const x = (imgRect.right + imgRect.left) / 2 - conRect.left;
    const y = (imgRect.bottom + imgRect.top) / 2 - conRect.top;

    setCenterCoords({ x, y });
  }, [
    imageRef.current,
    containerRef.current,
    staticPanCoords,
    activePanCoords,
  ]);

  const drawCanvas = () => {
    if (!canvasRef.current || !imageRef.current || !containerRef.current)
      return;

    const img = imageRef.current;
    const cont = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const iHeight = img.height;
    const iWidth = img.width;
    const { x: ix, y: iy } = getImgBoundingRect(imageRef.current);

    const {
      height: cHeight,
      width: cWidth,
      x: cx,
      y: cy,
    } = cont.getBoundingClientRect();
    const chdpr = cHeight * dpr; // ch = container height
    const cwdpr = cWidth * dpr; // cw = container width
    const ihdpr = iHeight * dpr; // ih = image height
    const iwdpr = iWidth * dpr; //  iw = image width
    const xOff = (ix - cx) * dpr;
    const yOff = (iy - cy) * dpr;

    canvas.setAttribute('height', chdpr + '');
    canvas.setAttribute('width', cwdpr + '');
    canvas.setAttribute(
      'style',
      `height: ${cHeight / 2}px; width: ${cWidth / 2}px;`
    );

    const imgRect = img.getBoundingClientRect();
    const conRect = cont.getBoundingClientRect();
    const tx = ((imgRect.right + imgRect.left) / 2 - conRect.left) * dpr;
    const ty = ((imgRect.bottom + imgRect.top) / 2 - conRect.top) * dpr;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(tx, ty);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-tx, -ty);
    ctx.drawImage(img, xOff, yOff, iwdpr, ihdpr);
    ctx.resetTransform();
  };

  const getSelections = (
    boxes: CropperProps['boxes'] = props.boxes
  ): CropperBoxDataMap => {
    if (!canvasRef.current || !containerRef.current) return {};
    const canvas = canvasRef.current; // canvas source
    const ctx = canvas.getContext('2d');
    const cont = containerRef.current;
    if (!ctx) return {};

    const contRect = cont.getBoundingClientRect();

    return boxes.reduce<CropperBoxDataMap>((map, box) => {
      if (box.width === 0 || box.height === 0) return map;

      const { height, width } = canvas;

      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');

      tempCanvas.height = height * 3;
      tempCanvas.width = width * 3;

      const boxTopLeftEl = document
        .getElementById(box.id)
        ?.querySelector('.rmc__crop__corner-element__top-left');
      if (!boxTopLeftEl || !ctx) return map;

      const btlRect = boxTopLeftEl.getBoundingClientRect();
      const targetX = btlRect.x - contRect.x;
      const targetY = btlRect.y - contRect.y;
      const boxTopLeftX = targetX * dpr + width;
      const boxTopLeftY = targetY * dpr + height;

      ctx.translate(boxTopLeftX, boxTopLeftY);
      ctx.rotate((-box.rotation * Math.PI) / 180);
      ctx.translate(-boxTopLeftX, -boxTopLeftY);
      ctx.drawImage(canvas, width, height);

      const rotatedImageData = ctx.getImageData(
        boxTopLeftX,
        boxTopLeftY,
        box.width * dpr,
        box.height * dpr
      );

      const finalImageUrl = imageDataToDataUrl(rotatedImageData);
      if (!finalImageUrl) return map;

      return { ...map, [box.id]: finalImageUrl };
    }, {});
  };

  useEffect(() => {
    clearTimeout(propSizeTimeout.current);
    propSizeTimeout.current = window.setTimeout(() => {
      drawCanvas();
      props.onCrop?.({ type: 'manual-resize' }, getSelections(), undefined);
    }, imageDebounceTime);
  }, [props.width, props.height]);

  const prevRotation = useRef(rotation);
  useEffect(() => {
    cancelAnimationFrame(rotationFrame.current);
    rotationFrame.current = requestAnimationFrame(() => {
      const rotationDiff = rotation - prevRotation.current;
      const boxes = props.boxes.map((box) => ({
        ...box,
        rotation: box.rotation + rotationDiff,
      }));

      prevRotation.current = rotation;

      props.onChange?.({ type: 'rotate' }, undefined, undefined, boxes);

      clearTimeout(rotationTimeout.current);
      rotationTimeout.current = window.setTimeout(() => {
        drawCanvas();
        props.onCrop?.({ type: 'rotate' }, getSelections(boxes), undefined);
      }, imageDebounceTime);
    });
  }, [rotation]);

  useResizeObserver({
    ref: imageRef,
    onResize: ({ width: _w, height: _h }: RefSize) => {
      const width = Math.round(_w);
      const height = Math.round(_h);

      if (
        !containerRef.current ||
        !imageRef.current ||
        !prevSize.current ||
        imageRef.current.getAttribute('src') !== props.src ||
        (prevSize.current.width === width && prevSize.current.height === height)
      )
        return;

      const hRatio = height / prevSize.current.height;
      const wRatio = width / prevSize.current.width;

      prevSize.current = { height, width };

      const boxes = props.boxes.map((box) => ({
        ...box,
        x: box.x * wRatio,
        y: box.y * hRatio,
        height: box.height * hRatio,
        width: box.width * wRatio,
      }));

      const imgRect = imageRef.current.getBoundingClientRect();
      const contRect = containerRef.current.getBoundingClientRect();
      setCenterCoords({
        x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
        y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
      });
      drawCanvas();
      props.onChange?.({ type: 'auto-resize' }, undefined, undefined, boxes);
      clearTimeout(autoSizeTimeout.current);
      autoSizeTimeout.current = window.setTimeout(() => {
        props.onCrop?.(
          { type: 'manual-resize' },
          getSelections(boxes),
          undefined
        );
      }, imageDebounceTime);
    },
  });

  const onLoad: ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (!img) return;

    prevSize.current = {
      height: Math.round(img.height),
      width: Math.round(img.width),
    };
    lastUpdatedBox.current = undefined;

    drawCanvas();
    props.onLoad?.(e, getSelections());
  };

  const getCursorPosition = (e: MouseEvent) => {
    if (!containerRef.current) return {};

    const { left, top } = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - left - centerCoords.x,
      y: e.clientY - top - centerCoords.y,
    };
  };

  const getAbsoluteCursorPosition = (e: MouseEvent) => ({
    x: e.clientX,
    y: e.clientY,
  });

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
      pointA.current = getCursorPosition(e);
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
      const pointB = getCursorPosition(e);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;
      const box = {
        x: Math.min(pointA.current.x, pointB.x),
        y: Math.min(pointA.current.y, pointB.y),
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
          cursorMode === 'pan' && css.pan,
          isPanning && css.panning,
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
            height: '10px',
            width: '10px',
            background: 'red',
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
                top: staticPanCoords.y + activePanCoords.y + 'px',
                left: staticPanCoords.x + activePanCoords.x + 'px',
                transformOrigin: `${centerCoords.x}px ${centerCoords.y}px`,
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
