import { default as ROPolyfill } from 'resize-observer-polyfill';

window.ResizeObserver = window.ResizeObserver || ROPolyfill;
