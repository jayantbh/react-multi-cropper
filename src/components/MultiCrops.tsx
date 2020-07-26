import '../polyfills';

import React, {
  CSSProperties,
  FC,
  memo,
  MouseEvent,
  SyntheticEvent,
  UIEventHandler,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import sid from 'shortid';
import useResizeObserver from 'use-resize-observer';

import Crop from './Crop';
import Scrollbar from './Scrollbar';
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
  CartesianSize,
} from '../types';
import {
  getAbsoluteCursorPosition,
  getCursorPosition,
  getImageMapFromBoxes,
  getOffscreenImageMapFromBoxes,
  onImageLoad,
  performCanvasPaint,
  performOffscreenCanvasPaint,
  useCenteringCallback,
  // useCentering,
  useWheelEvent,
  usePrevious,
  usePropRotation,
  useScrollbars,
  useWorker,
  useZoom,
} from './MultiCrops.helpers';

import { deepEquals, isInView } from '../utils';

const blankCoords: Partial<Coordinates> = { x: undefined, y: undefined };
const blankStyles = {};

type Dimensions = {
  imgBaseHeight: number;
  imgBaseWidth: number;
};

const scrollbarSpacing = 6;

const MultiCrops: FC<CropperProps> = ({
  cursorMode = 'draw',
  rotation = 0,
  zoom = 1,
  onBoxClick,
  onBoxMouseEnter,
  onBoxMouseLeave,
  boxInView = undefined,
  boxViewZoomBuffer = 0.5,
  onSetRotation,
  imageStyles = {},
  ...props
}) => {
  const prevSrc = usePrevious(props.src);
  const srcChanged = prevSrc !== props.src;

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<CanvasWorker>(null);

  const pointA = useRef<Partial<Coordinates>>(blankCoords);
  const id = useRef<string>(sid.generate());
  const drawingIndex = useRef(-1);
  const prevContSize = useRef<RefSize | undefined>(undefined);
  const lastUpdatedBox = useRef<CropperBox | undefined>(undefined);
  const isDrawing = useRef<boolean>(false);

  const panFrame = useRef(-1);
  const wheelFrame = useRef(-1);
  const keyFrame = useRef(-1);

  const [isPanning, setIsPanning] = useState(false);
  const [staticPanCoords, setStaticPanCoords] = useState({ x: 0, y: 0 });
  const [activePanCoords, setActivePanCoords] = useState({ x: 0, y: 0 });

  const hasOCSupport = !!canvasRef.current?.transferControlToOffscreen;

  const img = imageRef.current;
  const xScale = (img?.naturalWidth || 0) / ((img?.width || 0) * zoom);
  const yScale = (img?.naturalHeight || 0) / ((img?.height || 0) * zoom);
  const scalingFactor = (() => {
    const w = img?.naturalWidth || 0;
    const h = img?.naturalHeight || 0;
    const size = Math.max(w, h);
    const targetSize = 1500;

    if (!size) return 1;
    return targetSize / size;
  })();
  const imgScale: CartesianSize = {
    x: Number.isFinite(xScale) ? xScale * scalingFactor : scalingFactor,
    y: Number.isFinite(yScale) ? yScale * scalingFactor : scalingFactor,
  };

  const [{ imgBaseHeight, imgBaseWidth }, setDimensions] = useState<Dimensions>(
    {
      imgBaseHeight: 0,
      imgBaseWidth: 0,
    }
  );

  const srcBaseZoomMap = useRef({});
  const getUpdatedDimensions = ({
    doStateUpdate = true,
    eventType,
  }: {
    doStateUpdate?: boolean;
    eventType: CropperEventType;
  }): undefined | Dimensions => {
    if (!imageRef.current?.complete || srcChanged) return;

    const imageRefHeight = imageRef.current?.naturalHeight || 0;
    const imageRefWidth = imageRef.current?.naturalWidth || 0;
    const containerRefHeight = containerRef.current?.offsetHeight || 0;
    const containerRefWidth = containerRef.current?.offsetWidth || 0;
    const imgAspectRatio = imageRefWidth / imageRefHeight || 1;
    const containerAspectRatio = containerRefWidth / containerRefHeight || 1;
    const newZoomOffset =
      imgAspectRatio > containerAspectRatio
        ? (containerRefWidth || 1) / (imageRefWidth || 1)
        : (containerRefHeight || 1) / (imageRefHeight || 1);
    const imgBaseHeight = (imageRefHeight || 0) * newZoomOffset;
    const imgBaseWidth = (imageRefWidth || 0) * newZoomOffset;

    const fields: Dimensions = {
      imgBaseHeight,
      imgBaseWidth,
    };

    const oldZoomOffset = srcBaseZoomMap.current[props.src] || newZoomOffset;

    srcBaseZoomMap.current = {
      ...srcBaseZoomMap.current,
      [props.src]: newZoomOffset,
    };

    const ratio = newZoomOffset / oldZoomOffset;

    if (ratio !== 1) {
      const newBoxes = props.boxes.map((box) => ({
        ...box,
        x: box.x * ratio,
        y: box.y * ratio,
        height: box.height * ratio,
        width: box.width * ratio,
      }));

      props.onChange?.({ type: eventType }, undefined, undefined, newBoxes);
    }
    doStateUpdate && setDimensions(fields);
    return fields;
  };

  const { wl, wr, ht, hb, pxScaleW, pxScaleH } = useScrollbars(
    containerRef.current,
    imageRef.current
  );

  useEffect(() => {
    getUpdatedDimensions({ eventType: 'src-change' });
  }, [props.src]);

  useEffect(() => {
    if (!boxInView) return;

    const box = props?.boxes?.find((b) => b.id === boxInView.id);
    const { rotate = true, panInView = true } = boxInView;
    const boxRect = document
      .getElementById(box?.id || '')
      ?.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const containerRefHeight = containerRef.current?.offsetHeight || 0;
    const containerRefWidth = containerRef.current?.offsetWidth || 0;
    if (containerRefHeight && containerRefWidth && box) {
      const boxHeight = box?.height / zoom;
      const boxWidth = box?.width / zoom;
      const heightRatio = boxHeight / containerRefHeight;
      const widthRatio = boxWidth / containerRefWidth;

      let newZoom = Math.min(
        1 / Math.max(heightRatio, widthRatio) - boxViewZoomBuffer,
        zoom
      );
      const newX = (newZoom * box?.x) / zoom;
      const newY = (newZoom * box?.y) / zoom;
      const newWidth = (newZoom * box?.width) / zoom;
      const newHeight = (newZoom * box?.height) / zoom;
      const xPan = -(newX + newWidth / 2);
      const yPan = -(newY + newHeight / 2);

      if (!isInView(containerRect, boxRect)) {
        setStaticPanCoords({ x: xPan, y: yPan });
        props.onZoomGesture?.(newZoom);
        onSetRotation?.((rotation + 360 - box?.rotation) % 360);
      } else {
        panInView && setStaticPanCoords({ x: xPan, y: yPan });
        rotate && onSetRotation?.((rotation + 360 - box?.rotation) % 360);
      }
    }
  }, [boxInView]);

  useWorker(
    workerRef,
    canvasRef.current,
    hasOCSupport,
    props.onCrop,
    lastUpdatedBox
  );

  const [centerCoords, setCenterCoords] = useCenteringCallback(
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
          zoom,
          imgScale
        )
      : performOffscreenCanvasPaint(
          imageRef.current,
          containerRef.current,
          workerRef.current,
          staticPanCoords,
          activePanCoords,
          rotation,
          zoom,
          imgScale
        );

  const getSelections = (
    boxes: CropperProps['boxes'] = props.boxes,
    eventType: CropperEventType = 'draw-end'
  ) => {
    return !hasOCSupport
      ? getImageMapFromBoxes(
          boxes,
          containerRef.current,
          canvasRef.current,
          imgScale
        )
      : getOffscreenImageMapFromBoxes(
          boxes,
          containerRef.current,
          workerRef.current,
          eventType,
          imgScale
        );
  };

  usePropRotation(rotation, props.boxes, props.onChange, srcChanged);

  useZoom(
    imageRef.current,
    containerRef.current,
    props.src,
    props.boxes,
    props.onChange,
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
        (newHeight === height && newWidth === width)
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
    getUpdatedDimensions({ eventType: 'load' });

    onImageLoad(
      lastUpdatedBox,
      props.onLoad,
      drawCanvas,
      getSelections,
      containerRef.current,
      setCenterCoords,
      setStaticPanCoords,
      getUpdatedDimensions
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
    if (props.disableMouse?.all) return;

    if (
      imageRef.current &&
      !e.nativeEvent.composedPath().includes(imageRef.current) &&
      containerRef.current &&
      !e.nativeEvent.composedPath().includes(containerRef.current)
    ) {
      return;
    }
    if (cursorMode === 'pan' && !props.disableMouse?.pan) {
      pointA.current = getAbsoluteCursorPosition(e);
      setIsPanning(true);
      setStaticPanCoords({
        x: staticPanCoords.x + activePanCoords.x,
        y: staticPanCoords.y + activePanCoords.y,
      });
      setActivePanCoords({ x: 0, y: 0 });
    } else if (cursorMode === 'draw' && !props.disableMouse?.draw) {
      pointA.current = getCursorPosition(e, containerRef.current, centerCoords);
      drawingIndex.current = props.boxes.length;
      id.current = sid.generate();
      isDrawing.current = true;
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const { onChange, boxes, disableMouse } = props;
    if (disableMouse?.all) return;

    if (cursorMode === 'pan' && isPanning && !disableMouse?.pan) {
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
    } else if (cursorMode === 'draw' && !disableMouse?.draw) {
      const pointB = getCursorPosition(e, containerRef.current, centerCoords);
      if (!(pointA.current.x && pointA.current.y && pointB.x && pointB.y))
        return;

      const lastBox: Partial<CropperBox> = boxes[drawingIndex.current] || {};
      const box = {
        ...lastBox,
        id: lastBox.id || id.current,
        rotation: lastBox.rotation || 0,
        x: Math.min(pointA.current.x, pointB.x),
        y: Math.min(pointA.current.y, pointB.y),
        width: Math.abs(pointA.current.x - pointB.x),
        height: Math.abs(pointA.current.y - pointB.y),
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
    if (props.disableMouse?.all) return;
    if (
      cursorMode === 'pan' &&
      (activePanCoords.x || activePanCoords.y) &&
      !props.disableMouse?.pan
    ) {
      cancelAnimationFrame(panFrame.current);
      setIsPanning(false);
      setStaticPanCoords({
        x: staticPanCoords.x + activePanCoords.x,
        y: staticPanCoords.y + activePanCoords.y,
      });
      setActivePanCoords({ x: 0, y: 0 });
    } else if (cursorMode === 'draw' && !props.disableMouse?.draw) {
      if (!isDrawing.current) return;
      if (props.boxes[drawingIndex.current]) handleCrop(e, 'draw-end');
    }
    isDrawing.current = false;
    pointA.current = {};
  };

  useWheelEvent(
    containerRef,
    (e: WheelEvent) => {
      if (props.disableMouse?.all) return;

      e.preventDefault();
      e.stopPropagation();
      const { deltaX, deltaY, shiftKey } = e;
      let delta = deltaY || deltaX;

      // Mouse-wheel workaround (non touchpad)
      if (Math.abs(delta) >= 40) delta /= 40;

      cancelAnimationFrame(wheelFrame.current);
      wheelFrame.current = requestAnimationFrame(() => {
        if (shiftKey && !props.disableMouse?.zoom) {
          props.onZoomGesture?.(zoom + delta * 0.01);
        } else if (!props.disableMouse?.pan) {
          setStaticPanCoords((coords) => ({
            x: coords.x - deltaX * pxScaleH,
            y: coords.y - deltaY * pxScaleW,
          }));

          setCenterCoords();
        }
      });
    },
    [props.onZoomGesture, zoom, setCenterCoords, props.disableMouse]
  );

  const boxesOnImage = useMemo(() => {
    return props.boxes.map((box, index) => (
      <CropContainer
        key={box.id}
        index={index}
        box={box}
        cursorMode={cursorMode}
        onBoxClick={onBoxClick}
        onBoxMouseEnter={onBoxMouseEnter}
        onBoxMouseLeave={onBoxMouseLeave}
        onDelete={props.onDelete}
      />
    ));
  }, [props.boxes, cursorMode, onBoxClick, onBoxMouseEnter, onBoxMouseLeave]);

  return (
    <>
      <div
        tabIndex={0}
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
        onScroll={handleContainerScroll}
        onKeyDown={(e) => {
          if (props.disableKeyboard) return;

          const { key, shiftKey } = e;

          const arrowPressed =
            key === 'ArrowRight' ||
            key === 'ArrowLeft' ||
            key === 'ArrowUp' ||
            key === 'ArrowDown';
          if (!arrowPressed) return;

          e.preventDefault();
          e.stopPropagation();
          cancelAnimationFrame(keyFrame.current);
          keyFrame.current = requestAnimationFrame(() => {
            if (shiftKey) {
              const delta =
                key === 'ArrowRight' || key === 'ArrowUp'
                  ? 0.05
                  : key === 'ArrowLeft' || key === 'ArrowDown'
                  ? -0.05
                  : 0;
              props.onZoomGesture?.(zoom + delta);
            } else {
              const deltaX =
                key === 'ArrowRight' ? 10 : key === 'ArrowLeft' ? -10 : 0;
              const deltaY =
                key === 'ArrowDown' ? 10 : key === 'ArrowUp' ? -10 : 0;

              setStaticPanCoords({
                x: staticPanCoords.x + deltaX * pxScaleH,
                y: staticPanCoords.y + deltaY * pxScaleW,
              });

              setCenterCoords();
            }
          });
        }}
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
            ...imageStyles,
            transform: `
              translate(
              ${staticPanCoords.x + activePanCoords.x}px,
              ${staticPanCoords.y + activePanCoords.y}px)
              rotate(${rotation}deg)
              scale(${zoom})${
              imageStyles?.transform ? ' ' + imageStyles?.transform : ''
            }
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
          {boxesOnImage}
        </div>
        <Scrollbar
          type={'horizontal'}
          style={{
            left: `calc(${wl}% + ${scrollbarSpacing}px)`,
            right: `calc(${wr}% + ${scrollbarSpacing}px)`,
          }}
          isHidden={!wl && !wr}
          onScroll={(diff: number) =>
            setStaticPanCoords({
              ...staticPanCoords,
              x: staticPanCoords.x + diff * pxScaleH,
            })
          }
        />
        <Scrollbar
          type={'vertical'}
          style={{
            top: `calc(${ht}% + ${scrollbarSpacing}px)`,
            bottom: `calc(${hb}% + ${scrollbarSpacing}px)`,
          }}
          isHidden={!ht && !hb}
          onScroll={(diff: number) =>
            setStaticPanCoords({
              ...staticPanCoords,
              y: staticPanCoords.y + diff * pxScaleW,
            })
          }
        />
      </div>
      <canvas ref={canvasRef} className={css.canvas} />
    </>
  );
};

const handleContainerScroll: UIEventHandler = (e) => {
  e.preventDefault();
  e.stopPropagation();
};

type CropContainerProps = Pick<
  CropperProps,
  | 'cursorMode'
  | 'onBoxClick'
  | 'onBoxMouseLeave'
  | 'onBoxMouseEnter'
  | 'onDelete'
> & {
  box: CropperBox;
  index: number;
};
const CropContainer: FC<CropContainerProps> = memo(
  (props) => {
    const {
      cursorMode,
      box,
      onBoxClick,
      onBoxMouseEnter,
      onBoxMouseLeave,
      index,
    } = props;

    const style: CSSProperties = useMemo(() => {
      const defaults: CSSProperties = {
        pointerEvents: cursorMode === 'pan' ? 'none' : 'auto',
        transform: `rotate(${box.rotation}deg)`,
        position: 'absolute',
        boxShadow: '0 0 0 2px #000',
      };

      const styleProp = box.style || {};
      return typeof styleProp === 'function'
        ? styleProp(defaults)
        : { ...defaults, ...box.style };
    }, [cursorMode, box.rotation, box.style]);

    return (
      <Crop
        {...props}
        key={box.id || index}
        index={index}
        box={box}
        onBoxClick={onBoxClick}
        onBoxMouseEnter={onBoxMouseEnter}
        onBoxMouseLeave={onBoxMouseLeave}
        style={style}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      deepEquals(prevProps.box, nextProps.box) &&
      prevProps.index === nextProps.index &&
      prevProps.cursorMode === nextProps.cursorMode
    );
  }
);

export default memo(MultiCrops);
