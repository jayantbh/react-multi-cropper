import React, { CSSProperties, useEffect, useRef, useState } from 'react';
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

const initialBoxes: CropperBox[] = [
  {
    x: -178,
    y: -191,
    width: 120,
    height: 178,
    id: 'SJxb6YpuG',
    rotation: 10,
    style: (prevStyle: CSSProperties) => {
      return { ...prevStyle, boxShadow: '0 0 0 2px #ff0' };
    },
    labelStyle: { visibility: 'hidden' },
  },
  // { x: -87, y: -183, width: 69, height: 234, id: 'V-iSOh80u', rotation: -46 },
  // { x: -51, y: -162, width: 67, height: 269, id: '7_sRCTJdI', rotation: -116 },
  // { x: -118, y: -219, width: 78, height: 331, id: 'LkZ7r33rk', rotation: -222 },
  // { x: -193, y: -206, width: 71, height: 377, id: 'HDFMSvIDX', rotation: -241 },
  // { x: -215, y: -180, width: 77, height: 339, id: 'v-3TX_fom', rotation: -297 },
];

const App = () => {
  const resetCenterRef = useRef(() => {});
  const resetCenter = resetCenterRef.current;

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
    pan?: boolean;
  }>({});

  useEffect(() => {
    setCursorMode('draw');
    setFileRotationMap({
      ...fileRotationMap,
      [src]: fileRotationMap[src] || 0,
    });
  }, [src]);

  const updateBoxes: UpdateFunction = (_e, _bx, i, _boxes) => {
    if (i && !fileBoxesMap[src]?.[i])
      _boxes[i] = { ..._boxes[i], labelStyle: { display: 'none' } };

    setFileBoxesMap({ ...fileBoxesMap, [src]: _boxes });
  };

  const setRotation = (rot: number) => {
    setFileRotationMap({ ...fileRotationMap, [src]: rot });
  };

  const setZoom = (zoom: number) => {
    setFileZoomMap({
      ...fileZoomMap,
      [src]: Math.max(0.1, Math.min(zoom, 10)),
    });
  };

  const handleClick: UpdateFunction = (_e, bx, _i, _boxes) => {
    console.log('click');
    setFileBoxesMap({
      ...fileBoxesMap,
      [src]: _boxes.map((box) => ({
        ...box,
        labelStyle: box.id === bx?.id ? {} : { display: 'none' },
      })),
    });
    bx && setBoxInView({ id: bx.id });
  };

  const handleMouseEnter: UpdateFunction = (event, box, index, boxes) => {
    console.log(event, box, index, boxes);
  };

  const handleMouseLeave: UpdateFunction = (event, box, index, boxes) => {
    console.log(event, box, index, boxes);
  };
  const handleBoxButtonClick = (id: string) => {
    setBoxInView({ id, pan: false });
  };

  const cropperRef = useRef<HTMLDivElement | null>(null);

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h1>Dragging, Drawing, Resizing rectangles on the image</h1>
      <button onClick={() => setImages([...images.slice(1), src])}>
        Toggle Image
      </button>
      <button
        onClick={() => setCursorMode(cursorMode === 'draw' ? 'pan' : 'draw')}
      >
        Toggle Mode [{cursorMode}]
      </button>
      <button
        onClick={() => {
          const el = cropperRef.current;
          const img = cropperRef.current?.querySelector('img');
          if (!el || !img) return;

          const h = el.clientHeight / img.clientHeight;
          const w = el.clientWidth / img.clientWidth;

          const zoomRatio = Math.min(h, w);
          const newBoxes =
            fileBoxesMap[src]?.map((box) => ({
              ...box,
              x: box.x * zoomRatio,
              y: box.y * zoomRatio,
              height: box.height * zoomRatio,
              width: box.width * zoomRatio,
            })) || [];

          setFileBoxesMap({ ...fileBoxesMap, [src]: newBoxes });

          setRotation(0);
          setZoom(1);
          resetCenter();
        }}
      >
        Reset
      </button>
      <button
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
      </button>
      <span>
        <label htmlFor='zoom'>
          Zoom: ({(fileZoomMap[src] || 1).toFixed(2)})
        </label>
        <input
          id='zoom'
          type='range'
          min={0.1}
          max={10}
          step={0.01}
          value={fileZoomMap[src] || 1}
          onChange={(e) => setZoom(Number(e.currentTarget.value))}
        />
      </span>
      <span>
        <label htmlFor='rotation'>
          Rotation: ({(fileRotationMap[src] || 0).toString().padStart(3, '0')}{' '}
          deg)
        </label>
        <input
          id='rotation'
          type='range'
          min={0}
          max={360}
          step={1}
          value={fileRotationMap[src] || 0}
          onChange={(e) => setRotation(Number(e.currentTarget.value))}
        />
      </span>
      <span>
        <div>
          <p style={{ display: 'inline-block' }}>
            Click a button to view a box
          </p>
          <>
            {fileBoxesMap[src]?.map((box) => (
              <div
                style={{ display: 'inline-block', padding: '10px' }}
                key={box.id}
              >
                <button
                  value={box.id}
                  onClick={() => handleBoxButtonClick(box.id)}
                >
                  {box.id}
                </button>
              </div>
            ))}
          </>
        </div>
      </span>
      <div ref={cropperRef}>
        <MultiCrops
          src={src}
          zoom={fileZoomMap[src] || 1}
          onZoomGesture={setZoom}
          modifiable={false}
          containerStyles={{
            height: '500px',
            width: '100%',
          }}
          CustomLabel={({ index }: { index: number }) =>
            index > 1 ? (
              <div style={{ marginRight: 2 }}>Im: {index + 1}</div>
            ) : null
          }
          boxes={fileBoxesMap[src] || []}
          onChange={updateBoxes}
          onCrop={(e, map, currentImg) => {
            console.log('Crop', e, map, currentImg?.boxId);
            if (e.type === 'draw-end') {
              if (!currentImg) return;
              const { dataUrl, boxId } = currentImg;
              setImageMap({ ...imageMap, [boxId]: dataUrl });
            } else if (e.type === 'load') setImageMap(map);
          }}
          onDelete={(e, box, index, boxes) => {
            console.log('Delete', box, index, boxes);
            updateBoxes(e, box, index, boxes);
          }}
          onLoad={(map, reset) => {
            console.log('Loaded: ', map);
            setImageMap(map);
            resetCenterRef.current = reset;
          }}
          cursorMode={cursorMode}
          rotation={fileRotationMap[src] || 0}
          onBoxClick={handleClick}
          onBoxMouseEnter={handleMouseEnter}
          onBoxMouseLeave={handleMouseLeave}
          boxInView={boxInView}
          boxViewZoomBuffer={0.1}
          onSetRotation={setRotation}
        />
      </div>
      {(fileBoxesMap[src] || []).map(
        (box, i) => !!imageMap[box.id] && <img src={imageMap[box.id]} key={i} />
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
