import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import MultiCrops from '../dist';
import img1 from './imgs/sample1.jpg';
import img2 from './imgs/sample2.jpg';
import {
  CropperBox,
  CropperBoxDataMap,
  CropperCursorMode,
  CropperProps,
} from '../dist';

const initialBoxes: CropperBox[] = Array(10)
  .fill(0)
  .map((_, i) => ({
    left: 178 + i * 10,
    top: 191 + i * 10,
    width: 120,
    height: 178,
    id: 'SJxb6YpuG-' + i,
    angle: 10 - Math.random() * 20,
    style: {
      stroke: 'red',
    },
  }));

type MapOf<T> = { [key in string]?: T };

const App = () => {
  const resetCenterRef = useRef(() => {});
  const initReset = resetCenterRef.current;
  const [images, setImages] = useState([img1, img2]);
  const [cursorMode, setCursorMode] = useState<CropperCursorMode[]>([
    'draw',
    'pan',
    'select',
  ]);
  const src = images[0];
  const [imageMap, setImageMap] = useState<CropperBoxDataMap>({});
  const [fileBoxesMap, setFileBoxesMap] = useState<MapOf<CropperBox[]>>({
    [src]: initialBoxes,
  });
  const [fileRotationMap, setFileRotationMap] = useState<MapOf<number>>({});
  const [fileZoomMap, setFileZoomMap] = useState<{ [key in string]?: number }>(
    {}
  );

  useEffect(() => {
    setFileRotationMap({
      ...fileRotationMap,
      [src]: fileRotationMap[src] || 0,
    });
  }, [src]);

  const setRotation = (rot: number) => {
    setFileRotationMap({
      ...fileRotationMap,
      [src]: rot,
    });
  };

  const setZoom = (zoom: number) => {
    setFileZoomMap({
      ...fileZoomMap,
      [src]: Math.max(0.1, Math.min(zoom, 2)),
    });
  };

  const updateBoxes: CropperProps['onChange'] = (e, _bx, _i, _boxes) => {
    console.log(e.type, src, fileBoxesMap[src]?.length, _boxes?.length);
    setFileBoxesMap({
      ...fileBoxesMap,
      [src]: [...(_boxes || [])],
    });
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h1>Dragging, Drawing, Resizing rectangles on the image</h1>
      <button
        onClick={() => {
          setImages([...images.slice(1), images[0]]);
          setFileRotationMap((map) => ({
            ...map,
            [images[0]]: 0,
          }));
          setFileZoomMap((map) => ({
            ...map,
            [images[0]]: 0,
          }));
        }}
      >
        Toggle Image
      </button>
      <button
        onClick={() => setCursorMode(cursorMode.slice(1).concat(cursorMode[0]))}
      >
        Toggle Mode [{cursorMode[0]} -&gt; {cursorMode[1]}]
      </button>
      <button
        onClick={() => {
          initReset();
          setRotation(0);
          setZoom(1);
        }}
      >
        Reset
      </button>
      <span>
        <label htmlFor='zoom'>
          Zoom: ({(fileZoomMap[src] || 1).toFixed(2)})
        </label>
        <input
          id='zoom'
          type='range'
          min={0.1}
          max={2.0}
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
      <MultiCrops
        zoom={fileZoomMap[src] || 1}
        src={images[0]}
        disableKeyboard={false}
        disableMouse={{ all: false }}
        containerStyles={{ height: '500px', width: '100%' }}
        boxes={fileBoxesMap[src] || []}
        onChange={updateBoxes}
        onCrop={(e, map, currentImg?, box?) => {
          console.log('Crop', e, map, currentImg?.boxId);
          setImageMap(map);
          box &&
            setFileBoxesMap((map) => ({
              ...map,
              [src]: map[src]?.concat(box),
            }));
        }}
        onDelete={(e, box, index, boxes) => {
          console.log('Delete', box, index, boxes);
          updateBoxes(e, box, index, boxes);
        }}
        onZoomGesture={setZoom}
        onLoad={(map, reset) => {
          setImageMap(map);
          resetCenterRef.current = reset;
        }}
        cursorMode={cursorMode[0]}
        rotation={fileRotationMap[src] || 0}
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
      {(fileBoxesMap[src] || []).map(
        (box, i) =>
          !!imageMap[box.id] && (
            <img src={imageMap[box.id]} key={i} alt={box.id} />
          )
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
