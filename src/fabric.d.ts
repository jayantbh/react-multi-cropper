import 'fabric';
import * as f from 'fabric';

declare module 'fabric' {
  export namespace fabric {
    const a: number;
    export class Lol {}
    interface Control {
      constructor(opts: f.fabric.ICanvasOptions): this;
    }
    // @ts-ignore
    export interface Object {
      controls: any;
      constructor(opts: f.fabric.IObjectOptions): this;
    }
  }
  // const fabric: typeof f.fabric & {
  //   Control: Control;
  //   Object: Object;
  // };
}
