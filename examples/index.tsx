import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import MultiCrops from '../dist';
import img1 from './imgs/sample1.jpg';
import img2 from './imgs/sample2.jpg';
import { CropperBox, CropperBoxDataMap } from '../dist';
import { CropperCursorMode, CropperProps } from '../src/types';

const initialBoxes: CropperBox[] = [
  { x: -178, y: -191, width: 120, height: 178, id: 'SJxb6YpuG', rotation: 0 },
  { x: -87, y: -183, width: 69, height: 234, id: 'V-iSOh80u', rotation: -46 },
  { x: -51, y: -162, width: 67, height: 269, id: '7_sRCTJdI', rotation: -116 },
  { x: -118, y: -219, width: 78, height: 331, id: 'LkZ7r33rk', rotation: -222 },
  { x: -193, y: -206, width: 71, height: 377, id: 'HDFMSvIDX', rotation: -241 },
  { x: -215, y: -180, width: 77, height: 339, id: 'v-3TX_fom', rotation: -297 },
];

const App = () => {
  const [images, setImages] = useState([img1, img2]);
  const src = images[0];

  const [cursorMode, setCursorMode] = useState<CropperCursorMode>('pan');

  const [fileBoxesMap, setFileBoxesMap] = useState<
    { [key in string]?: CropperBox[] }
  >({ [src]: initialBoxes });
  const [fileRotationMap, setFileRotationMap] = useState<
    { [key in string]?: number }
  >({});
  const [fileZoomMap, setFileZoomMap] = useState<{ [key in string]?: number }>(
    {}
  );

  const [imageMap, setImageMap] = useState<CropperBoxDataMap>({});

  useEffect(() => {
    setCursorMode('draw');
    setFileRotationMap({
      ...fileRotationMap,
      [src]: fileRotationMap[src] || 0,
    });
  }, [src]);

  const updateBoxes: CropperProps['onChange'] = (e, bx, i, _boxes) => {
    console.log(e.type, src, fileBoxesMap[src]?.length, _boxes.length);
    setFileBoxesMap({
      ...fileBoxesMap,
      [src]: _boxes,
    });
  };

  const setRotation = (rot: number) => {
    setFileRotationMap({
      ...fileRotationMap,
      [src]: rot,
    });
  };

  const setZoom = (zoom: number) => {
    setFileZoomMap({
      ...fileZoomMap,
      [src]: zoom,
    });
  };

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
        src={src}
        width={`${100 * (fileZoomMap[src] || 1)}%`}
        modifiable={true}
        containerStyles={{
          height: '500px',
          width: '100%',
        }}
        boxes={fileBoxesMap[src] || []}
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
        rotation={fileRotationMap[src] || 0}
      />
      {(fileBoxesMap[src] || []).map(
        (box, i) => !!imageMap[box.id] && <img src={imageMap[box.id]} key={i} />
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
