import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import MultiCrops from '../dist';
import img1 from './imgs/sample1.jpg';
import img2 from './imgs/sample2.jpg';
import { CropperBox, CropperBoxDataMap } from '../dist';

const App = () => {
  const [images, setImages] = useState([img1, img2]);
  const [boxes, setBoxes] = useState<CropperBox[]>([
    {
      x: 178,
      y: 91,
      width: 120,
      height: 178,
      id: 'SJxb6YpuG',
    },
    {
      x: 436,
      y: 97,
      width: 170,
      height: 168,
      id: 'SJMZ6YTdf',
    },
  ]);

  const [imageMap, setImageMap] = useState<CropperBoxDataMap>({});

  const updateBoxes = useCallback((e, bx, i, _boxes) => setBoxes(_boxes), []);

  return (
    <div>
      <h1 style={{ fontFamily: 'sans-serif' }}>
        Dragging, Drawing, Resizing rectangles on the image
      </h1>
      <button onClick={() => setImages([...images.slice(1), images[0]])}>
        Toggle Image
      </button>
      <MultiCrops
        src={images[0]}
        width={'100%'}
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
      />
      {boxes.map(
        (box, i) => !!imageMap[box.id] && <img src={imageMap[box.id]} key={i} />
      )}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
