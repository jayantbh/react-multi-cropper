import insideWorker from 'offscreen-canvas/inside-worker';

insideWorker((e) => {
  console.log('In Worker', e);
  if (e.data.canvas) {
    // Draw on the canvas
  } else if (e.data.message === 'move') {
    // Messages from main thread
  }
});
