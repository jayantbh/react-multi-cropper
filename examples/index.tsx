import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import MultiCrops from '../dist';
import img1 from './imgs/sample1.jpg';
import img2 from './imgs/sample2.jpg';
import { CropperBox, CropperBoxDataMap } from '../dist';
import { CropperCursorMode } from '../src/types';

const App = () => {
  const [images, setImages] = useState([img1, img2]);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [cursorMode, setCursorMode] = useState<CropperCursorMode>('pan');
  const [boxes, setBoxes] = useState<CropperBox[]>([
    {
      x: -178,
      y: -191,
      width: 120,
      height: 178,
      id: 'SJxb6YpuG',
    },
    {
      x: 136,
      y: -97,
      width: 170,
      height: 168,
      id: 'SJMZ6YTdf',
    },
  ]);

  const [imageMap, setImageMap] = useState<CropperBoxDataMap>({});

  const updateBoxes = useCallback((e, bx, i, _boxes) => setBoxes(_boxes), []);

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h1>Dragging, Drawing, Resizing rectangles on the image</h1>
      <button onClick={() => setImages([...images.slice(1), images[0]])}>
        Toggle Image
      </button>
      <button
        onClick={() => setCursorMode(cursorMode === 'draw' ? 'pan' : 'draw')}
      >
        Toggle Mode [{cursorMode}]
      </button>
      <span>
        <label htmlFor='zoom'>Zoom: ({zoom.toFixed(2)})</label>
        <input
          id='zoom'
          type='range'
          min={0.1}
          max={2.0}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.currentTarget.value))}
        />
      </span>
      <span>
        <label htmlFor='rotation'>
          Rotation: ({rotation.toString().padStart(3, '0')} deg)
        </label>
        <input
          id='rotation'
          type='range'
          min={0}
          max={360}
          step={1}
          value={rotation}
          onChange={(e) => setRotation(Number(e.currentTarget.value))}
        />
      </span>
      <MultiCrops
        src={images[0]}
        width={`${100 * zoom}%`}
        containerStyles={{
          height: '500px',
          width: '100%',
        }}
        boxes={boxes}
        onChange={updateBoxes}
        onCrop={(e, map, currentImg) => {
          console.log('Crop', e, map, currentImg?.boxId);
          setImageMap(map);
        }}
        onDelete={(e, box, index, boxes) => {
          console.log('Delete', box, index, boxes);
          updateBoxes(e, box, index, boxes);
        }}
        onLoad={(e, map) => {
          console.log(
            'Loaded: ',
            e.currentTarget.height,
            e.currentTarget.width
          );
          setImageMap(map);
        }}
        cursorMode={cursorMode}
        rotation={rotation}
      />
      {boxes.map(
        (box, i) => !!imageMap[box.id] && <img src={imageMap[box.id]} key={i} />
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
