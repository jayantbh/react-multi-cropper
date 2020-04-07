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

const blankCoords: Coordinates = { x: undefined, y: undefined };
const blankStyles = {};

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pointA = useRef<Coordinates>(blankCoords);
  const id = useRef<string>(sid.generate());
  const drawingIndex = useRef(-1);
  const prevSize = useRef<RefSize | undefined>(undefined);
  const lastUpdatedBox = useRef<CropperBox | undefined>(undefined);
  const isDrawing = useRef<boolean>(false);

  const panFrame = useRef(-1);
  const rotateZoomFrame = useRef(-1);
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

    console.log('center', x, y);
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

    const dpr = window.devicePixelRatio;

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
    canvas.setAttribute('style', `height: ${cHeight}px; width: ${cWidth}px;`);

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

  const getSelections = (): CropperBoxDataMap => {
    if (!canvasRef.current) return {};
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return {};

    return props.boxes.reduce<CropperBoxDataMap>((map, box) => {
      const { x, y, width, height } = box;
      if (width === 0 || height === 0) return map;
      const dpr = window.devicePixelRatio;

      const imageData = imageDataToDataUrl(
        ctx.getImageData(x * dpr, y * dpr, width * dpr, height * dpr)
      );

      if (!imageData) return map;

      return { ...map, [box.id]: imageData };
    }, {});
  };

  useEffect(() => {
    cancelAnimationFrame(rotateZoomFrame.current);
    rotateZoomFrame.current = requestAnimationFrame(() => {
      drawCanvas();
      props.onCrop?.({ type: 'rotate-zoom' }, getSelections(), undefined);
    });
  }, [props.width, props.height, rotation]);

  useResizeObserver({
    ref: imageRef,
    onResize: ({ width: _w, height: _h }: RefSize) => {
      const width = Math.round(_w);
      const height = Math.round(_h);

      // If image elements don't exist
      // or image may not have been initialized (prevSize not set)
      // or image changed but props yet to update (ResizeObserver fired early)
      // or image dimensions have not changed
      // do nothing
      if (
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

      drawCanvas();
      props.onChange?.({ type: 'auto-resize' }, undefined, undefined, boxes);
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
      x: e.clientX - left,
      y: e.clientY - top,
    };
  };

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

    const { x, y } = getCursorPosition(e);

    pointA.current = { x, y };

    if (cursorMode === 'pan') {
      setIsPanning(true);
      setStaticPanCoords({
        x: staticPanCoords.x + activePanCoords.x,
        y: staticPanCoords.y + activePanCoords.y,
      });
      setActivePanCoords({ x: 0, y: 0 });
    } else if (cursorMode === 'draw') {
      drawingIndex.current = props.boxes.length;
      id.current = sid.generate();
      isDrawing.current = true;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const { onChange, boxes } = props;
    const pointB = getCursorPosition(e);

    if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y)) return;

    if (cursorMode === 'pan' && isPanning) {
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
      const box = {
        x: Math.min(pointA.current.x, pointB.x),
        y: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
        id: id.current,
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
        {props.boxes.map((box, index) => (
          <Crop
            {...props}
            key={box.id || index}
            index={index}
            box={box}
            onChange={onChange}
            onCrop={handleCrop}
            centerCoords={centerCoords}
            style={{
              pointerEvents: cursorMode === 'pan' ? 'none' : 'auto',
              top: staticPanCoords.y + activePanCoords.y + 'px',
              left: staticPanCoords.x + activePanCoords.x + 'px',
              transformOrigin: `${centerCoords.x}px ${centerCoords.y}px`,
              // transform: `
              //   translate(
              //   ${staticPanCoords.x + activePanCoords.x}px,
              //   ${staticPanCoords.y + activePanCoords.y}px)
              //   rotate(${rotation}deg)
              // `,
              transform: `
                rotate(${rotation}deg)
              `,
            }}
          />
        ))}
        <div
          style={{
            height: '10px',
            width: '10px',
            background: 'red',
            position: 'absolute',
            top: `${centerCoords.y}px`,
            left: `${centerCoords.x}px`,
            //   transform: `
            //   translate(
            //   ${staticPanCoords.x + activePanCoords.x}px,
            //   ${staticPanCoords.y + activePanCoords.y}px)
            //   rotate(${rotation}deg)
            // `,
          }}
        />
      </div>
      <canvas ref={canvasRef} className={css.canvas} />
    </>
  );
};

export default MultiCrops;
