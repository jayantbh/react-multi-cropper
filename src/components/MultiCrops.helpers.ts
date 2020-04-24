import {
  CustomRect
} from '../types';
import { imageDataToDataUrl, getCenterCoords } from '../utils';

import { fabric } from 'fabric';
const dpr =  2;// window.devicePixelRatio;


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
  console.log('translate',imgValues.translateX, imgValues.translateY)
  ctx.resetTransform();
  

};
export const getCroppedImageFromBox = (
  image: fabric.Image,
  canvas: fabric.Canvas,
  rotation: number,
  // boxes: any,
  staticPanCoords:any,
  boxes: any[]
): any => {
  if (!canvas || !image) return {};
  const {
    height,
    width,
  } = canvas.getElement().getBoundingClientRect();
  const aspectRatio = (image.width || 0) / (image.height || 0);

  let imgValues = getCenterCoords(image);

  console.log(rotation);
  let map: any = {};
  boxes.map((box: CustomRect) => {
    if (box.width === 0 || box.height === 0) return;
    let {angle:rotateAngle = 0,  initRotation =0 } = box;
    let tempCanvas = document.createElement('canvas');
    let ctx: any = tempCanvas.getContext('2d');
    tempCanvas.height = height*dpr;
    tempCanvas.width = width*dpr;
    let tx = imgValues.translateX - staticPanCoords.x;
    let ty = imgValues.translateY - staticPanCoords.y;
    ctx.fillRect(0, 0, width, height);
    const boxTopLeftX = imgValues.translateX * dpr;
    const boxTopLeftY = imgValues.translateY * dpr;
    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate(initRotation * Math.PI/ 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(image.getElement(), tx*dpr,ty*dpr,height * dpr * aspectRatio, height * dpr);

    canvas.discardActiveObject();
    canvas.renderAll();
    let activeObject1 = new fabric.ActiveSelection([image, box], {

    });
    canvas.setActiveObject(activeObject1);
    if (activeObject1 != null) {
      activeObject1.rotate(-rotateAngle);

      canvas.discardActiveObject();
    }

    const rotatedImageData = ctx.getImageData(
      (box.left || 0) * dpr,
      (box.top|| 0) * dpr,
      box.getScaledWidth() * dpr,
      box.getScaledHeight() * dpr
    );
    let activeObject2 = new fabric.ActiveSelection([image, box], {

    });
    canvas.setActiveObject(activeObject2);
    if (activeObject2 != null) {
      activeObject2.rotate(rotateAngle);

      canvas.discardActiveObject();
    }
    canvas.renderAll();
    const finalImageUrl = imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return;
    map = { ...map, [box.id]: finalImageUrl };
    return;
  }, {})
  return map
}
