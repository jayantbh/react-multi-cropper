import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import MultiCrops, {
  getAbsoluteDetectedBoxes,
  CropperBox,
  CropperBoxDataMap,
  CropperCursorMode,
  UpdateFunction,
} from '../dist';

import img1 from './imgs/sample1.jpg';
import img2 from './imgs/sample2.jpg';

const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...props}
    className={`button is-primary is-light is-outlined is-rounded ${props.className}`}
  />
);

const randVal = (max: number, min: number = 0) =>
  Math.random() * min + (max - min);

const initialBoxes: CropperBox[] = Array(8)
  .fill({})
  .map((_, i) => ({
    left: 278 + i * randVal(10, -10),
    top: 41 + i * randVal(10, -10),
    width: 120 + randVal(100, -50),
    height: 178 + randVal(100, -50),
    id: 'box-id--' + i,
    angle: randVal(20, -20),
    style: {
      stroke: '#aa0',
      fill: 'rgba(255, 255, 255, 0.05)',
      hover: {
        stroke: '#0fa',
      },
    },
    showCross: true,
    noImage: true,
  }));
// { x: -87, y: -183, width: 69, height: 234, id: 'V-iSOh80u', rotation: -46 },
// { x: -51, y: -162, width: 67, height: 269, id: '7_sRCTJdI', rotation: -116 },
// { x: -118, y: -219, width: 78, height: 331, id: 'LkZ7r33rk', rotation: -222 },
// { x: -193, y: -206, width: 71, height: 377, id: 'HDFMSvIDX', rotation: -241 },
// { x: -215, y: -180, width: 77, height: 339, id: 'v-3TX_fom', rotation: -297 },

const containerStyles = {
  height: '500px',
  width: '100%',
};

const imageStyles = { filter: 'hue-rotate(69deg)' };

const App = () => {
  const resetCenterRef = useRef(() => {});
  const resetCenter = resetCenterRef.current;

  const [isSelecting, setIsSelecting] = useState(false);
  const [images, setImages] = useState([img1, img2]);
  const src = images[0];

  const [cursorMode, setCursorMode] = useState<CropperCursorMode>('pan');

  const [fileBoxesMap, setFileBoxesMap] = useState<
    { [key in string]?: CropperBox[] }
  >({
    [src]: initialBoxes,
  });
  const [fileRotationMap, setFileRotationMap] = useState<
    { [key in string]?: number }
  >({});
  const [fileZoomMap, setFileZoomMap] = useState<{ [key in string]?: number }>(
    {}
  );

  const [imageMap, setImageMap] = useState<CropperBoxDataMap>({});

  const [boxInView, setBoxInView] = useState<{
    id?: string;
    rotate?: boolean;
    panInView?: boolean;
  }>({});

  useEffect(() => {
    setCursorMode('draw');
    setFileRotationMap({
      ...fileRotationMap,
      [src]: fileRotationMap[src] || 0,
    });
  }, [src]);

  const updateBoxes: UpdateFunction = useCallback(
    (_e, _bx, i = 0, _boxes) => {
      // new box somehow (check handleCrop)
      if (i >= 0 && !fileBoxesMap[src]?.[i] && _boxes) {
        _boxes[i] = { ..._boxes[i], showCross: false, layer: -1 };
      }

      console.log('ONCROP', _boxes);
      setFileBoxesMap((boxMap) => ({ ...boxMap, [src]: _boxes }));
    },
    [src]
  );

  const setRotation = useCallback(
    (rot: number) => {
      setFileRotationMap((rotMap) => ({ ...rotMap, [src]: rot }));
    },
    [src]
  );

  const setZoom = useCallback(
    (nextZoom: number) => {
      const zoom = Math.max(0.1, Math.min(nextZoom, 10));
      setFileZoomMap((zoomMap) => ({
        ...zoomMap,
        [src]: zoom,
      }));
    },
    [src, setFileZoomMap, setFileBoxesMap]
  );

  const handleClick: UpdateFunction = useCallback(
    (_e, bx, _i) => {
      console.log('click');
      bx && setBoxInView({ id: bx.id });
    },
    [src, setBoxInView, setFileBoxesMap]
  );

  const handleMouseEnter: UpdateFunction = useCallback(
    (event, box, index, boxes) => {
      console.log(event, box, index, boxes);
    },
    []
  );

  const handleMouseLeave: UpdateFunction = useCallback(
    (event, box, index, boxes) => {
      console.log(event, box, index, boxes);
    },
    []
  );

  const handleBoxButtonClick = (id: string) => {
    setBoxInView({ id, panInView: false, rotate: false });
  };

  const reset = () => {
    setRotation(0);
    setZoom(1);
    resetCenter();
  };

  useEffect(reset, [src]);

  const handleCrop = useCallback(
    (e, map, currentImg, box) => {
      console.log('Crop', e, map, currentImg?.boxId, box);
      if (e.type === 'draw-end') {
        if (!currentImg) return;
        if (currentImg) {
          const { dataUrl, boxId } = currentImg;
          setImageMap((im) => ({ ...im, [boxId]: dataUrl }));
        }

        if (box) {
          setFileBoxesMap((map) => ({
            ...map,
            [src]: [...(map[src] || []), { ...box, layer: -1 }],
          }));
        }
      } else if (e.type === 'load') setImageMap(map);
    },
    [src]
  );

  const handleLoad = useCallback(
    (map, reset) => {
      console.log('Loaded: ', map);
      setImageMap(map);
      resetCenterRef.current = reset;
    },
    [setImageMap]
  );

  const handleDelete = useCallback(
    (e, box, index, boxes) => {
      console.log('Delete', box, index, boxes);
      updateBoxes(e, box, index, boxes);
    },
    [updateBoxes]
  );

  const CustomLabel = useCallback(
    ({ index, box }) =>
      index > 1 && !box.meta?.word ? (
        <div style={{ marginRight: 2 }}>Im: {index + 1}</div>
      ) : null,
    []
  );

  const cropperRef = useRef<HTMLDivElement | null>(null);

  const [disableMouse, setDisableMouse] = useState({
    all: false,
    draw: false,
    pan: false,
    zoom: false,
  });

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <div className={'section pt-4'}>
        <div className={'container'}>
          <h1 className={'title'} style={{ marginLeft: '-0.03em' }}>
            React Multi Crops
          </h1>
          <h2 className={'subtitle'}>
            Dragging, Drawing, Resizing rectangles on the image
          </h2>
        </div>
        <div className={'container buttons mt-4'}>
          <Button onClick={() => setImages([...images.slice(1), src])}>
            Toggle Image
          </Button>
          <Button
            onClick={() =>
              setCursorMode(
                cursorMode === 'draw'
                  ? 'pan'
                  : cursorMode === 'pan'
                  ? 'select'
                  : 'draw'
              )
            }
          >
            Toggle Mode [{cursorMode}]
          </Button>
          <Button onClick={reset}>Reset</Button>
          <Button
            onClick={() => {
              const boxes = fileBoxesMap?.[src];
              const lastBox = boxes?.[boxes?.length - 1];
              if (!lastBox) return;

              setFileBoxesMap({
                ...fileBoxesMap,
                [src]: [
                  ...(boxes || []),
                  ...getAbsoluteDetectedBoxes(lastBox, [
                    [5, 5, lastBox.width / 2 - 5, lastBox.height / 2 - 5],
                    [
                      Math.abs(lastBox.width / 2),
                      Math.abs(lastBox.height / 2),
                      lastBox.width / 2 - 5,
                      lastBox.height / 2 - 5,
                    ],
                  ]),
                ],
              });
            }}
          >
            Add Children
          </Button>
        </div>
        <div className={'container'}>
          <div className={'is-inline-flex'}>
            <div>
              <label htmlFor='zoom' className={'is-block'}>
                Zoom: ({(fileZoomMap[src] || 1).toFixed(2)})
              </label>
              <input
                id='zoom'
                type='range'
                className={'slider mt-2'}
                min={0.1}
                max={10}
                step={0.01}
                value={fileZoomMap[src] || 1}
                onChange={(e) => setZoom(Number(e.currentTarget.value))}
              />
            </div>
            <div className={'ml-4'}>
              <label htmlFor='rotation' className={'is-block'}>
                Rotation: (
                {(fileRotationMap[src] || 0).toString().padStart(3, '0')} deg)
              </label>
              <input
                id='rotation'
                type='range'
                className={'slider mt-2'}
                min={0}
                max={360}
                step={1}
                value={fileRotationMap[src] || 0}
                onChange={(e) => setRotation(Number(e.currentTarget.value))}
              />
            </div>
            <div className={'ml-4'}>
              <label className='checkbox control'>
                <input
                  type='checkbox'
                  checked={isSelecting}
                  onChange={(e) => {
                    const { checked } = e.currentTarget;
                    setIsSelecting(checked);
                  }}
                />{' '}
                Select, instead of draw boxes
              </label>
            </div>
          </div>
        </div>
        <div className={'container'}>
          <div>
            <div>Disable mouse input for:</div>
            <div className={'field is-grouped'}>
              <label className='checkbox control'>
                <input
                  type='checkbox'
                  checked={disableMouse.all}
                  onChange={(e) => {
                    const { checked } = e.currentTarget;
                    setDisableMouse((opts) => ({
                      ...opts,
                      all: checked,
                    }));
                  }}
                />{' '}
                all
              </label>
              <label className='checkbox control'>
                <input
                  type='checkbox'
                  checked={disableMouse.draw}
                  onChange={(e) => {
                    const { checked } = e.currentTarget;
                    setDisableMouse((opts) => ({
                      ...opts,
                      draw: checked,
                    }));
                  }}
                />{' '}
                draw
              </label>
              <label className='checkbox control'>
                <input
                  type='checkbox'
                  checked={disableMouse.pan}
                  onChange={(e) => {
                    const { checked } = e.currentTarget;
                    setDisableMouse((opts) => ({
                      ...opts,
                      pan: checked,
                    }));
                  }}
                />{' '}
                pan
              </label>
              <label className='checkbox control'>
                <input
                  type='checkbox'
                  checked={disableMouse.zoom}
                  onChange={(e) => {
                    const { checked } = e.currentTarget;
                    setDisableMouse((opts) => ({
                      ...opts,
                      zoom: checked,
                    }));
                  }}
                />{' '}
                zoom
              </label>
            </div>
          </div>
        </div>
        <div
          className={'container pb-4 mt-4'}
          style={{ maxHeight: '200px', overflow: 'auto' }}
        >
          <p style={{ display: 'inline-block' }}>
            Click a Button to view a box
          </p>
          <div className={'buttons'}>
            {fileBoxesMap[src]?.map((box) => (
              <Button
                key={box.id}
                value={box.id}
                onClick={() => handleBoxButtonClick(box.id)}
              >
                {box.id}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div ref={cropperRef}>
        <MultiCrops
          src={src}
          zoom={fileZoomMap[src] || 1}
          onZoomGesture={setZoom}
          containerStyles={containerStyles}
          CustomLabel={CustomLabel}
          boxes={fileBoxesMap[src] || []}
          onChange={updateBoxes}
          onCrop={handleCrop}
          onDelete={handleDelete}
          onLoad={handleLoad}
          cursorMode={cursorMode}
          rotation={fileRotationMap[src] || 0}
          onBoxClick={handleClick}
          onBoxMouseEnter={handleMouseEnter}
          onBoxMouseLeave={handleMouseLeave}
          boxInView={boxInView}
          boxViewZoomBuffer={0.1}
          onSetRotation={setRotation}
          imageStyles={imageStyles}
          disableMouse={disableMouse}
          onSelect={(map) => {
            setFileBoxesMap((boxMap) => ({
              ...boxMap,
              [src]: boxMap[src]?.map((box) =>
                !!map[box.id]
                  ? { ...box, style: { stroke: 'yellow' } }
                  : { ...box, style: { stroke: 'red' } }
              ),
            }));
            console.log('On select', map);
          }}
        />
      </div>
      {(fileBoxesMap[src] || []).map(
        (box, i) =>
          !!imageMap[box.id] && (
            <img
              src={imageMap[box.id]}
              key={i}
              alt={'boxes image, index ' + i}
            />
          )
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
