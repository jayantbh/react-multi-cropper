# React Multi Cropper
A component for allowing multiple cropping regions on a single image.

![build](https://badgen.net/github/status/jayantbh/react-multi-cropper)
![version](https://badgen.net/npm/v/react-multi-cropper)
![size](https://badgen.net/bundlephobia/minzip/react-multi-cropper)
![downloads](https://badgen.net/npm/dt/react-multi-cropper)

_WIP: Certain aspects are in development, and may be incomplete or buggy._  
_It should be fine for most purposes._

A newer implementation is available on the `fab-2` branch.  
The implementation on this branch (`master`) works fine too, but isn't very performant for a large number of boxes.  

It's a fork of [this repo](https://github.com/beizhedenglong/react-multi-crops), but with several improvements.
- Typescript
- Smaller bundle size
- A bit better styling
- Better code design
- More features

![screenshot](https://i.snipboard.io/XHaY6L.jpg)


## Installation
```bash
yarn add react-multi-cropper
```

## Development
```bash
yarn install
yarn start # in one terminal
yarn serve # in another
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.  
If `3000` is occupied, the terminal output will show you what URL the serve command is serving on.

## Usage

See the examples/index.tsx file.

**Ensure** that the `worker-src` [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) is set correctly.
```
worker-src blob:
```
One way to set it is:
```html
<meta http-equiv="Content-Security-Policy" content="worker-src blob:" />
```

## Functionality

Draw rectangular regions on an image to obtain the selected area as a base64 encoded data URL.  
Multiple regions can be obtained by drawing multiple boxes.

The component is responsive, so the image dimensions can use relative units (like %), and the cropping regions/rectangles should stay in place w.r.t. the image.

The cropping logic is aware of the device pixel ratio, so you won't get blurry crops on a MacBook or phone.

## Documentation

### Default Usage
```typescript jsx
const Cropper = ({ imageUrl }: { imageUrl: string ) => {
  const [boxes, setBoxes] = useState<CropperBox[]>([]);
  const [imageMap, setImageMap] = useState<CropperBoxDataMap>({});

  const updateBoxes = (_, __, _boxes) => setBoxes(_boxes);

  return (
    <div>
      <MultiCrops
        src={imageUrl}
        zoom={1}
        boxes={boxes}
        onChange={updateBoxes}
        onCrop={(e, map) => setImageMap(map)}
        onLoad={(map) => setImageMap(map)}
      />
      {boxes.map((box, i) =>
        !!imageMap[box.id] && <img src={imageMap[box.id]} key={i} />
      )}
    </div>
  );
};
```

#### How to reset zoom, rotation, and pan?
In `examples/index.tsx`, you'll see an implementation of reset.
```typescript jsx
() => {
  setRotation(0);
  setZoom(1);
  resetCenter();
}
```
`setRotation`, and `setZoom` are simple state setting functions obtained from a `useState`.  
`resetCenter` needs a few more lines.  
**Note:** Due to the current implementation, when resetting the component you must
reset `rotation` before `zoom` to avoid bugs. It would be changed in the future to
use a different update mechanism.

The second argument of `onLoad` provides the reset handler.
To call this from anywhere, you may want to assign this to a ref.

```typescript jsx
// Initialize a ref to store the function
const resetCenterRef = useRef(() => {});
const resetCenter = resetCenterRef.current;

// Call function anywhere
resetCenter();

// Obtain the function from onLoad
onLoad={(map, reset) => {
  setImageMap(map);
  resetCenterRef.current = reset;
}}
```


### Props for the `MultiCrops` component
```typescript
type CropperProps = {
  src: string;
  zoom?: number;
  rotation?: number; // degrees
  boxes: CropperBox[];
  onChange?: UpdateFunction;
  onDelete?: UpdateFunction;
  onBoxMouseEnter?: UpdateFunction;
  onBoxMouseLeave?: UpdateFunction;
  onBoxClick?: UpdateFunction;
  onLoad?: ImgOnLoadWithImageData;
  onCrop?: CropTriggerFunctionWithImageData;
  onZoomGesture?: (newZoom: number) => any;
  containerClassName?: string;
  containerStyles?: CSSProperties;
  imageStyles?: CSSProperties;
  cursorMode?: CropperCursorMode;
  disableKeyboard?: boolean;
  disableMouse?: {
    all?: boolean;
    zoom?: boolean;
    pan?: boolean;
    draw?: boolean;
  };
  CustomLabel?: FC<{ box: CropperBox; index: number }>;
  boxInView?: { id?: string; rotate?: boolean; panInView?: boolean };
  onSetRotation?: Function;
  boxViewZoomBuffer?: number;
};
```

**All the above types have been exported from the module.**

### Notes:
- The `onLoad` prop is **optional**, but useful for two things.
  1. To determine that the image has indeed loaded, same as an `img` tag.
  2. If you passed some predefined boxes, the supplied function will receive the image data associated with those boxes.
  3. To get a resetCenter handler to reset the panned position of the image.
- You need to pass a function the `onChange` prop if you want the default functionality to work out of the box.
  - It is however optional, in case you want the box drawing to be controlled externally.
- The function supplied to `onCrop` will be called when a drawing operation was completed. This will be needed if you want to receive the image payload after a cropping action was done.
  - The first argument is a `CropperEvent` event that tells you all you need to know about the event that was triggered to cause this function to fire.
  - The second argument is a dictionary of box.id's and their respective base64 encoded image contents.
- Remove the ability to change a box after drawing it. The existing functionality was not stable enough to leave it, and leaving it in caused more issues than were manageable.
- Mouse/Touchpad wheel to pan/zoom is supported. But touchpad zoom gesture is not. Example for wheel zoom is present in the examples/index.tsx.
- Arrow Keys based pan/zoom is supported.
- It would be advisable to memoize the functions passed to the component.
- If you want to pass a box for reasons other than getting the imageData out of it, add the `noImage: true` key-val to it.
