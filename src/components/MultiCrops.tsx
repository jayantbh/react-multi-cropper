import '../polyfills';

import React, {
  FC,
  MouseEvent,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import sid from 'shortid';
import useResizeObserver from 'use-resize-observer';

import Crop from './Crop';
import css from './MultiCrops.module.scss';
import {
  Coordinates,
  CanvasWorker,
  CropperBox,
  CropperEvent,
  CropperProps,
  CurrentImgParam,
  RefSize,
  CropperEventType,
} from '../types';
import {
  getAbsoluteCursorPosition,
  getCursorPosition,
  getImageMapFromBoxes,
  getOffscreenImageMapFromBoxes,
  onImageLoad,
  performCanvasPaint,
  performOffscreenCanvasPaint,
  useCentering,
  usePrevious,
  usePropResize,
  usePropRotation,
  useWorker,
  useZoom,
} from './MultiCrops.helpers';

const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};

type Dimensions = {
  imgRectHeight: number;
  imgRectWidth: number;
  imgBaseHeight: number;
  imgBaseWidth: number;
  zoomOffset: number;
};

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  zoom = 1,
  ...props
}) => {
  const { src: prevSrc } = usePrevious({ src: props.src });
  const srcChanged = prevSrc !== props.src;

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<CanvasWorker>(null);

  const pointA = useRef<Partial<Coordinates>>(blankCoords);
  const id = useRef<string>(sid.generate());
  const drawingIndex = useRef(-1);
  const prevImgSize = useRef<RefSize | undefined>(undefined);
  const prevContSize = useRef<RefSize | undefined>(undefined);
  const lastUpdatedBox = useRef<CropperBox | undefined>(undefined);
  const isDrawing = useRef<boolean>(false);

  const panFrame = useRef(-1);
  const autoSizeTimeout = useRef(-1);

  const [isPanning, setIsPanning] = useState(false);
  const [staticPanCoords, setStaticPanCoords] = useState({ x: 0, y: 0 });
  const [activePanCoords, setActivePanCoords] = useState({ x: 0, y: 0 });

  const hasOCSupport = !!canvasRef.current?.transferControlToOffscreen;

  const [
    { imgRectHeight, imgRectWidth, imgBaseHeight, imgBaseWidth, zoomOffset },
    setDimensions,
  ] = useState<Dimensions>({
    imgRectHeight: 0,
    imgRectWidth: 0,
    imgBaseHeight: 0,
    imgBaseWidth: 0,
    zoomOffset: 0,
  });

  const getUpdatedDimensions = (
    doStateUpdate = true
  ): undefined | Dimensions => {
    if (!imageRef.current?.complete || srcChanged) return;
    const doSetZoom = !zoomOffset;

    const imageRefHeight = imageRef.current?.naturalHeight || 0;
    const imageRefWidth = imageRef.current?.naturalWidth || 0;
    const containerRefHeight = containerRef.current?.offsetHeight || 0;
    const containerRefWidth = containerRef.current?.offsetWidth || 0;
    const imgAspectRatio = imageRefWidth / imageRefHeight || 1;
    const containerAspectRatio = containerRefWidth / containerRefHeight || 1;
    const newZoomOffset = !doSetZoom
      ? zoomOffset
      : imgAspectRatio > containerAspectRatio
      ? (containerRefWidth || 1) / (imageRefWidth || 1)
      : (containerRefHeight || 1) / (imageRefHeight || 1);
    const imgBaseHeight = (imageRefHeight || 0) * newZoomOffset;
    const imgBaseWidth = (imageRefWidth || 0) * newZoomOffset;
    const { height = 0, width = 0 } =
      imageRef.current?.getBoundingClientRect() || {};

    const fields: Dimensions = {
      imgRectHeight: height,
      imgRectWidth: width,
      imgBaseHeight,
      imgBaseWidth,
      zoomOffset: newZoomOffset,
    };

    doStateUpdate && setDimensions(fields);
    return fields;
  };

  useEffect(() => {
    getUpdatedDimensions();
  }, [
    props.src,
    zoom,
    srcChanged,
    imageRef.current,
    imageRef.current,
    containerRef.current,
    containerRef.current,
  ]);

  useWorker(
    workerRef,
    canvasRef.current,
    hasOCSupport,
    props.onCrop,
    lastUpdatedBox
  );

  const [centerCoords, setCenterCoords] = useCentering(
    imageRef.current,
    containerRef.current,
    staticPanCoords,
    activePanCoords
  );

  const drawCanvas = () =>
    !hasOCSupport
      ? performCanvasPaint(
          imageRef.current,
          containerRef.current,
          canvasRef.current,
          staticPanCoords,
          activePanCoords,
          rotation,
          zoom
        )
      : performOffscreenCanvasPaint(
          imageRef.current,
          containerRef.current,
          workerRef.current,
          staticPanCoords,
          activePanCoords,
          rotation,
          zoom
        );

  const getSelections = (
    boxes: CropperProps['boxes'] = props.boxes,
    eventType: CropperEventType = 'draw-end'
  ) => {
    return !hasOCSupport
      ? getImageMapFromBoxes(boxes, containerRef.current, canvasRef.current)
      : getOffscreenImageMapFromBoxes(
          boxes,
          containerRef.current,
          workerRef.current,
          eventType
        );
  };

  usePropResize(
    imgRectWidth,
    imgRectHeight,
    props.onCrop,
    drawCanvas,
    getSelections,
    props.modifiable
  );

  usePropRotation(
    rotation,
    props.boxes,
    props.onChange,
    props.onCrop,
    drawCanvas,
    getSelections,
    srcChanged,
    props.modifiable
  );

  useZoom(
    imageRef.current,
    containerRef.current,
    prevImgSize,
    autoSizeTimeout,
    setCenterCoords,
    props.src,
    props.boxes,
    props.onChange,
    props.onCrop,
    drawCanvas,
    getSelections,
    props.modifiable,
    rotation,
    imgBaseWidth,
    imgBaseHeight,
    zoom
  );

  useResizeObserver({
    ref: containerRef,
    onResize: ({ width: _w, height: _h }: RefSize) => {
      const newWidth = Math.round(_w);
      const newHeight = Math.round(_h);
      const { width, height } = prevContSize.current || { width: 0, height: 0 };
      if (
        !containerRef.current ||
        !imageRef.current ||
        imageRef.current.getAttribute('src') !== props.src ||
        (newHeight !== height && newWidth !== width)
      )
        return;

      prevContSize.current = { height: newHeight, width: newWidth };

      const imgRect = imageRef.current.getBoundingClientRect();
      const contRect = containerRef.current.getBoundingClientRect();
      setCenterCoords({
        x: (imgRect.left + imgRect.right - contRect.left * 2) / 2,
        y: (imgRect.top + imgRect.bottom - contRect.top * 2) / 2,
      });
    },
  });

  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const fields = getUpdatedDimensions();

    onImageLoad(
      prevImgSize,
      lastUpdatedBox,
      props.onLoad,
      drawCanvas,
      getSelections,
      containerRef.current,
      setCenterCoords,
      (fields?.imgBaseWidth || 0) * zoom,
      (fields?.imgBaseHeight || 0) * zoom
    )(e);
  };

  const handleCrop = (e: CropperEvent['event'], type: CropperEvent['type']) => {
    drawCanvas();
    const selections = getSelections();

    if (!hasOCSupport && selections) {
      const boxId = lastUpdatedBox.current?.id;
      const currentImgParam: CurrentImgParam = boxId
        ? {
            boxId,
            dataUrl: selections[boxId],
          }
        : undefined;

      props.onCrop?.({ type, event: e }, selections, currentImgParam);
    } else {
      props.onChange?.(
        { type, event: e },
        lastUpdatedBox.current,
        drawingIndex.current,
        props.boxes
      );
    }

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
      props.modifiable && handleCrop(e, 'pan');
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
          width={Number.isFinite(imgBaseWidth) ? imgBaseWidth : 0}
          height={Number.isFinite(imgBaseHeight) ? imgBaseHeight : 0}
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
              scale(${zoom})
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
