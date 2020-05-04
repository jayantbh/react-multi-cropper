import {
  CustomRect
} from '../types';
import { imageDataToDataUrl, getCenterCoords, getImageDimensions, getScrollPositions } from '../utils';

import { fabric } from 'fabric';

const dpr = 2;// window.devicePixelRatio;


export const performCanvasPaint = (
  image: fabric.Image,
  canvasFab: any,
  canvasTar: any,
  rotation: any,

) => {
  if (!canvasTar || !image || !canvasFab) return;

  const ctx = canvasTar.getContext('2d');
  if (!ctx) return;
  const {
    height,
    width,
  } = canvasFab.getElement().getBoundingClientRect();
  canvasTar.height = height * dpr;
  canvasTar.width = width * dpr;
  let imgValues = getCenterCoords(image);
  const tx = imgValues.translateX * dpr;
  const ty = imgValues.translateY * dpr;
  const aspectRatio = (image.width || 0) / (image.height || 0);
  ctx.fillRect(0, 0, canvasFab.width, canvasFab.height);
  ctx.translate(tx, ty);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-tx, -ty);
  ctx.drawImage(image.getElement(), 0, 0, height * dpr * aspectRatio, height * dpr);
  console.log('translate', imgValues.translateX, imgValues.translateY)
  ctx.resetTransform();


};
export const getCroppedImageFromBox = (
  image: fabric.Image,
  canvas: fabric.Canvas,
  rotation: number,
  boxes: any[]
): any => {
  if (!canvas || !image) return {};
  const {
    height,
    width,
  } = canvas.getElement().getBoundingClientRect();
  // const aspectRatio = (image.width || 0) / (image.height || 0);

  let imgValues = getCenterCoords(image);
  console.log(rotation);
  let map: any = {};
  boxes.map((box: CustomRect) => {
    if (box.width === 0 || box.height === 0) return;
    let { angle: rotateAngle = 0, initRotation = 0 } = box;
    console.log('rotateAngle',rotateAngle);
    let tempCanvas = document.createElement('canvas');
    let ctx: any = tempCanvas.getContext('2d');
    tempCanvas.height = height * dpr;
    tempCanvas.width = width * dpr;
    let { height: imageHeight, width: imageWidth } = getImageDimensions(image, canvas.getElement())
    let tx = imgValues.translateX - imageWidth / 2;
    let ty = imgValues.translateY - imageHeight / 2;
    ctx.fillRect(0, 0, width, height);
    const boxTopLeftX = imgValues.translateX * dpr;
    const boxTopLeftY = imgValues.translateY * dpr;
    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate(initRotation * Math.PI / 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(image.getElement(), tx * dpr, ty * dpr, imageWidth * dpr, imageHeight * dpr);

    let activeObject = canvas.getActiveObject();
    canvas.discardActiveObject();
    canvas.renderAll();
    let activeObject1: any = new fabric.ActiveSelection([image, box], {
      hasRotatingPoint: false
    });
    canvas.setActiveObject(activeObject1);
    if (activeObject1 != null) {
      activeObject1.rotate(-rotateAngle);
    }
    let boxValues = getCenterCoords(box);
    const rotatedImageData = ctx.getImageData(
      (boxValues.translateX - (box.getScaledWidth())/2) * dpr,
      (boxValues.translateY - (box.getScaledHeight())/2) * dpr,
      (box.getScaledWidth()) * dpr,
      (box.getScaledHeight() )* dpr
    );
    canvas.setActiveObject(activeObject1);
    if (activeObject1 != null) {
      activeObject1.rotate(0);

      canvas.discardActiveObject();
    }
    canvas.setActiveObject(activeObject);
    canvas.renderAll();
    const finalImageUrl = imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return;
    map = { ...map, [box.id]: finalImageUrl };
    return;
  }, {})
  return map
}

export const useScrollbars = (
  canvas?: any,
  image?: any,
): any => {
  // const [centerCoords, setCenterCoords] = useState({x:0, y:0})
  if (!canvas || !image)
    return { wl: 0, wr: 0, ht: 0, hb: 0 };
  // useEffect(() => {
   return getScrollPositions(canvas, image);
  // setScrollPositions({ wl, wr, ht, hb });
  // },[canvas, image])
  // return 


  // const cRect = cont.getBoundingClientRect();
  // const iRect = img.getBoundingClientRect();

  // const resultantBoundsWL = cRect.right - iRect.left;
  // const resultantBoundsWR = iRect.right - cRect.left;
  // const resultantBoundsHT = cRect.bottom - iRect.top;
  // const resultantBoundsHB = iRect.bottom - cRect.top;

  // const wlExcess = Math.max(resultantBoundsWL / cRect.width - 1, 0);
  // const wrExcess = Math.max(resultantBoundsWR / cRect.width - 1, 0);
  // const htExcess = Math.max(resultantBoundsHT / cRect.height - 1, 0);
  // const hbExcess = Math.max(resultantBoundsHB / cRect.height - 1, 0);

  // const wl = (wlExcess / (wlExcess + wrExcess + 1)) * 100;
  // const wr = (wrExcess / (wlExcess + wrExcess + 1)) * 100;
  // const ht = (htExcess / (htExcess + hbExcess + 1)) * 100;
  // const hb = (hbExcess / (htExcess + hbExcess + 1)) * 100;

  // const _pxScaleW = 100 / (100 - wl + wr);
  // const _pxScaleH = 100 / (100 - hb + ht);
  // const pxScaleW = Number.isFinite(_pxScaleW) ? _pxScaleW : 0;
  // const pxScaleH = Number.isFinite(_pxScaleH) ? _pxScaleH : 0;

  // return { wl, wr, ht, hb, pxScaleW, pxScaleH };

};
