import React, { Component } from 'react';
import { fabric } from 'fabric';

export class FabricCanvas extends Component<any> {
    canvas: any;
    image:any;
    // imageRef:any = useRef<any>(null);
    constructor(props:any) {
        super(props)
    }
    componentDidMount() {
        this.canvas = new fabric.Canvas("main-canvas");
    
        this.canvas.setDimensions({ width: '100%', height: '100%' }, { cssOnly: true });
        this.renderImage()
    }
    renderImage = () => {

        const {cursorMode, src} = this.props;
    

        // canvasFab.setHeight(1000);
        // canvasFab.setWidth(1000);
        // @ts-ignore
        fabric.Image.fromURL(src, (img) => {
          // img.set({
          //   height: canvasFab.getHeight(),
          //   width: canvasFab.getWidth()
          // })
          img.scale(1);
          img.scaleToHeight(this.canvas.getHeight());
          img.scaleToWidth(this.canvas.getWidth());
          img.set({originX: 'center', originY: 'center'})
          this.image = img;

          // img.scale(0.5);
          this.canvas.add(img);
          //   canvasFab.setBackgroundImage(img, canvasFab.renderAll.bind(canvasFab), {
          //     scaleX: canvasFab.width / img.width,
          //     scaleY: canvasFab.height / img.height
          //  });
        },
          { selectable: cursorMode === 'pan' ? true : false, hasRotatingPoint: false, lockScalingX: true, lockScalingY: true }
        );
    }

   
    render() {
        return (
        <React.Fragment>
            <canvas id="main-canvas" style={{ width: '100%', height: '100%' }} ></canvas>
        </React.Fragment>
        )
    }
}