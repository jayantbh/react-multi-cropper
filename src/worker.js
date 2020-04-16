import insideWorker from 'offscreen-canvas/inside-worker';

let canvas = null;

const getOrigin = (e) =>
  e.currentTarget.location.origin || window.location.origin;

const post = (message, e) => {
  try {
    postMessage(message, getOrigin(e));
  }
  catch {
    postMessage(message);
  }
};

insideWorker((e) => {
  if (e.data.canvas) {
    canvas = e.data.canvas;
  }
  else if (e.data.update) {
    performCanvasPaint(e);
  }
  else if (e.data.retrieve) {
    getImageMap(e);
  }
});

const imageDataToDataUrl = async (imageData) => {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.putImageData(imageData, 0, 0);
  return await canvasToDataUrl(canvas);
};

const canvasToDataUrl = async (canvas) => {
  const f = new FileReader();
  const blob = await canvas.convertToBlob();

  return new Promise((resolve) => {
    f.onload = (e) => resolve(e.target.result);
    f.readAsDataURL(blob);
  });
};

const performCanvasPaint = (e) => {
  if (!canvas) return;

  const { chdpr, cwdpr, tx, ty, rotation, xOff, yOff, ihdpr, iwdpr, bitmap, } = e.data.update;
  canvas.height = chdpr;
  canvas.width = cwdpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(tx, ty);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-tx, -ty);
  ctx.drawImage(bitmap, xOff, yOff, iwdpr, ihdpr);
  ctx.resetTransform();
};

const getImageMap = async (e) => {
  if (!canvas) return;

  const boxes = e.data.retrieve.boxesForOfc;
  const eventType = e.data.retrieve.eventType;

  const imageBoxPromises = boxes.map((box) => (async () => {
    if (box.width === 0 || box.height === 0 || !canvas) return box;

    const { dpr, contRect, btlRect } = box;
    const { height, width } = canvas;

    const tempCanvas = new OffscreenCanvas(width * 3, height * 3);
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.height = height * 3;
    tempCanvas.width = width * 3;

    if (!ctx) return box;

    const targetX = btlRect.x - contRect.x;
    const targetY = btlRect.y - contRect.y;
    const boxTopLeftX = targetX * dpr + width;
    const boxTopLeftY = targetY * dpr + height;

    ctx.translate(boxTopLeftX, boxTopLeftY);
    ctx.rotate((-box.rotation * Math.PI) / 180);
    ctx.translate(-boxTopLeftX, -boxTopLeftY);
    ctx.drawImage(canvas, width, height);

    const rotatedImageData = ctx.getImageData(boxTopLeftX, boxTopLeftY, box.width * dpr, box.height * dpr);
    const finalImageUrl = await imageDataToDataUrl(rotatedImageData);
    if (!finalImageUrl) return box;

    return { ...box, finalImageUrl };
  })());

  const imageBoxes = await Promise.all(imageBoxPromises);
  const imageMap = imageBoxes.reduce((acc, box) => ({
    ...acc,
    [box.id]: box.finalImageUrl,
  }), {});

  post({ imageMap, eventType }, getOrigin(e));
};
