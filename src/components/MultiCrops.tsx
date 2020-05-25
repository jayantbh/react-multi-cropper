import '../polyfills';

import React, {
  CSSProperties,
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
  useCentering,
  useMounting,
  usePrevious,
  usePropResize,
  usePropRotation,
  useScrollbars,
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
  const autoSizeTimeout = useRef(-1);

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

  const [
    { imgRectHeight, imgRectWidth, imgBaseHeight, imgBaseWidth },
    setDimensions,
  ] = useState<Dimensions>({
    imgRectHeight: 0,
    imgRectWidth: 0,
    imgBaseHeight: 0,
    imgBaseWidth: 0,
  });

  const getUpdatedDimensions = (
    doStateUpdate = true
  ): undefined | Dimensions => {
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
    const { height = 0, width = 0 } =
      imageRef.current?.getBoundingClientRect() || {};

    const fields: Dimensions = {
      imgRectHeight: height,
      imgRectWidth: width,
      imgBaseHeight,
      imgBaseWidth,
    };

    doStateUpdate && setDimensions(fields);
    return fields;
  };

  const { wl, wr, ht, hb, pxScaleW, pxScaleH } = useScrollbars(
    containerRef.current,
    imageRef.current
  );

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

  useEffect(() => {
    if (boxInView) {
      const box = props?.boxes?.find((b) => b.id === boxInView);
      const containerRefHeight = containerRef.current?.offsetHeight || 0;
      const containerRefWidth = containerRef.current?.offsetWidth || 0;
      if (containerRefHeight && containerRefWidth && box) {
        const boxHeight = box?.height / zoom;
        const boxWidth = box?.width / zoom;
        const heightRatio = boxHeight / containerRefHeight;
        const widthRatio = boxWidth / containerRefWidth;

        let newZoom =
          1 / (heightRatio > widthRatio ? heightRatio : widthRatio) -
          boxViewZoomBuffer;
        const newX = (newZoom * box?.x) / zoom;
        const newY = (newZoom * box?.y) / zoom;
        const newWidth = (newZoom * box?.width) / zoom;
        const newHeight = (newZoom * box?.height) / zoom;
        const xPan = -1 * (newX + newWidth / 2);
        const yPan = -1 * (newY + newHeight / 2);

        props.onZoomGesture?.(newZoom);
        onSetRotation((rotation + 360 - box?.rotation) % 360);
        setStaticPanCoords({ x: xPan, y: yPan });
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
    getUpdatedDimensions();

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
    if (
      imageRef.current &&
      !e.nativeEvent.composedPath().includes(imageRef.current) &&
      containerRef.current &&
      !e.nativeEvent.composedPath().includes(containerRef.current)
    ) {
      return;
    }
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
        id: id.current,
        rotation: 0,
        ...(boxes[drawingIndex.current] || {}),
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
    if (cursorMode === 'pan' && (activePanCoords.x || activePanCoords.y)) {
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
      if (props.boxes[drawingIndex.current]) handleCrop(e, 'draw-end');

      isDrawing.current = false;
    }
    pointA.current = {};
  };

  const onChange: CropperProps['onChange'] = (e, box, index, boxes) => {
    lastUpdatedBox.current = box;
    props.onChange?.(e, box, index, boxes);
  };

  useMounting(containerRef, (e: WheelEvent) => {
    if (props.disableMouse) return;

    e.preventDefault();
    e.stopPropagation();
    const { deltaX, deltaY, shiftKey } = e;

    cancelAnimationFrame(wheelFrame.current);
    wheelFrame.current = requestAnimationFrame(() => {
      if (shiftKey) {
        props.onZoomGesture?.(zoom + deltaY * 0.01);
      } else {
        setStaticPanCoords({
          x: staticPanCoords.x - deltaX * pxScaleH,
          y: staticPanCoords.y - deltaY * pxScaleW,
        });
      }
    });
  });

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
        onScroll={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Hello');
        }}
        onKeyDown={(e) => {
          if (props.disableKeyboard) return;

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
          {props.boxes.map((box, index) => {
            const defaultStyle: CSSProperties = {
              pointerEvents: cursorMode === 'pan' ? 'none' : 'auto',
              transform: `rotate(${box.rotation}deg)`,
              position: 'absolute',
              boxShadow: '0 0 0 2px #000',
            };
            const styleProp = box.style || {};
            const style =
              typeof styleProp === 'function'
                ? styleProp(defaultStyle)
                : { ...defaultStyle, ...box.style };
            return (
              <Crop
                {...props}
                key={box.id || index}
                index={index}
                box={box}
                onChange={onChange}
                onCrop={handleCrop}
                onBoxClick={onBoxClick}
                onBoxMouseEnter={onBoxMouseEnter}
                onBoxMouseLeave={onBoxMouseLeave}
                style={style}
              />
            );
          })}
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

export default MultiCrops;
