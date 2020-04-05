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
  const resizeChangeFrame = useRef(-1);
  const rotateZoomFrame = useRef(-1);
  const [isPanning, setIsPanning] = useState(false);
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
    ref: containerRef,
    onResize: ({ width: _w, height: _h }: RefSize) => {
      const width = Math.round(_w),
        height = Math.round(_h);
      if (
        !containerRef.current ||
        (prevSize.current?.width === width &&
          prevSize.current?.height === height)
      )
        return;

      prevSize.current = { height, width };

      let {
        top,
        bottom,
        left,
        right,
      } = containerRef.current.getBoundingClientRect();
      bottom = bottom - top;
      right = right - left;
      top = 0;
      left = 0;

      let hasChanges = false;
      cancelAnimationFrame(resizeChangeFrame.current);
      resizeChangeFrame.current = requestAnimationFrame(() => {
        const boxes = props.boxes.map((box) => {
          const x = box.x <= left ? 0 : box.x >= right ? right - 1 : box.x;
          const y = box.y <= top ? 0 : box.y >= bottom ? bottom - 1 : box.y;
          const width = box.x + box.width >= right ? right - box.x : box.width;
          const height =
            box.y + box.height >= bottom ? bottom - box.y : box.height;

          if (
            x !== box.x ||
            y !== box.y ||
            width !== box.width ||
            height !== box.height
          )
            hasChanges = true;

          return {
            ...box,
            x,
            y,
            height,
            width,
          };
        });

        if (hasChanges)
          props.onChange?.(
            { type: 'auto-resize' },
            undefined,
            undefined,
            boxes
          );
      });
    },
  });

  const onLoad: ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (!img) return;

    drawCanvas();

    lastUpdatedBox.current = undefined;
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
          <div
            key={box.id || index}
            style={{ pointerEvents: cursorMode === 'pan' ? 'none' : 'auto' }}
          >
            <Crop
              {...props}
              index={index}
              box={box}
              onChange={onChange}
              onCrop={handleCrop}
            />
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className={css.canvas} />
    </>
  );
};

export default MultiCrops;
