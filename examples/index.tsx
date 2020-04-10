import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import MultiCrops from '../dist';
import img1 from './imgs/sample1.jpg';
import img2 from './imgs/sample2.jpg';
import { CropperBox, CropperBoxDataMap } from '../dist';
import { CropperCursorMode } from '../src/types';

const initialBoxes = [
  { x: -178, y: -191, width: 120, height: 178, id: 'SJxb6YpuG', rotation: 0 },
  { x: -87, y: -183, width: 69, height: 234, id: 'V-iSOh80u', rotation: -46 },
  { x: -51, y: -162, width: 67, height: 269, id: '7_sRCTJdI', rotation: -116 },
  { x: -118, y: -219, width: 78, height: 331, id: 'LkZ7r33rk', rotation: -222 },
  { x: -193, y: -206, width: 71, height: 377, id: 'HDFMSvIDX', rotation: -241 },
  { x: -215, y: -180, width: 77, height: 339, id: 'v-3TX_fom', rotation: -297 },
];

const App = () => {
  const [images, setImages] = useState([img1, img2]);
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [cursorMode, setCursorMode] = useState<CropperCursorMode>('pan');
  const [boxes, setBoxes] = useState<CropperBox[]>(initialBoxes);

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
