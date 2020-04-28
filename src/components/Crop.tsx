import React, { Component, CSSProperties, FC, MouseEvent } from 'react';
import interact from 'interactjs';
import type { ResizeEvent, Rect, DragEvent } from '@interactjs/types/types';
import { BoxLabel } from './BoxLabel';
import { update, remove, oneLevelEquals } from '../utils';
import {
  CropperBox,
  CropperEvent,
  CropperEventType,
  CropperProps,
  UpdateFunction,
} from '../types';

type Props = {
  index: number;
  box: CropperBox;
  boxes: CropperBox[];
  onChange?: UpdateFunction;
  onDelete?: UpdateFunction;
  onCrop: (e: CropperEvent['event'], type: CropperEvent['type']) => any;
  style?: CSSProperties;
  modifiable?: CropperProps['modifiable'];
  CustomLabel?: FC<{ box: CropperBox; index: number }>;
};

class Crop extends Component<Props> {
  crop: HTMLDivElement | null = null;

  shouldComponentUpdate(nextProps: Props) {
    return (
      !oneLevelEquals(nextProps.box, this.props.box) ||
      !oneLevelEquals(nextProps.style, this.props.style) ||
      nextProps.index !== this.props.index
    );
  }

  handleResizeMove = (e: ResizeEvent) => {
    const { index, box, boxes, onChange } = this.props;
    const { width, height } = e.rect;
    const { left, top } = e.deltaRect as Rect;

    const nextBox = {
      ...box,
      x: box.x + left,
      y: box.y + top,
      width,
      height,
    };

    const nextBoxes = update(index, nextBox, boxes);
    onChange?.({ type: 'resize', event: e }, nextBox, index, nextBoxes);
  };

  handleDragMove = (e: DragEvent) => {
    e.stopPropagation();
    const {
      index,
      box,
      box: { x, y },
      boxes,
      onChange,
    } = this.props;
    const { dx, dy } = e;
    const nextBox = { ...box, x: x + dx, y: y + dy };
    const nextBoxes = update(index, nextBox, boxes);
    onChange?.({ type: 'drag', event: e }, nextBox, index, nextBoxes);
  };

  handleDelete = (e: MouseEvent) => {
    const { index, box, onDelete, boxes } = this.props;
    const nextBoxes = remove(index, 1, boxes);
    onDelete?.({ type: 'delete', event: e }, box, index, nextBoxes);
  };

  handleCrop = (e: DragEvent | ResizeEvent) => {
    const type: CropperEventType = e.type === 'dragend' ? 'drag' : 'resize';
    this.props.onCrop(e, type);
  };

  componentDidMount(): void {
    if (!this.props.modifiable || !this.crop) return;
    // @ts-ignore
    interact(this.crop)
      .draggable({})
      .resizable({
        edges: {
          left: true,
          right: true,
          bottom: true,
          top: true,
        },
      })
      .on('dragmove', this.handleDragMove)
      .on('resizemove', this.handleResizeMove)
      .on(['resizeend', 'dragend'], this.handleCrop);
  }

  componentWillUnmount(): void {
    this.crop && interact(this.crop).unset();
  }

  render() {
    const {
      box,
      index,
      style = {},
      modifiable = true,
      CustomLabel,
    } = this.props;
    return (
      <div
        id={box.id}
        style={{
          ...cropStyle(box, style),
          pointerEvents: modifiable ? 'auto' : 'none',
        }}
        ref={(c) => (this.crop = c)}
      >
        <BoxLabel
          onClick={this.handleDelete}
          style={{ pointerEvents: 'initial' }}
        >
          {CustomLabel ? <CustomLabel box={box} index={index} /> : null}
        </BoxLabel>
        {FourDivs}
      </div>
    );
  }
}

const FourDivs = (
  <>
    <div
      className='rmc__crop__corner-element rmc__crop__corner-element__top-left'
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
    <div
      className='rmc__crop__corner-element rmc__crop__corner-element__top-right'
      style={{ position: 'absolute', top: 0, right: 0 }}
    />
    <div
      className='rmc__crop__corner-element rmc__crop__corner-element__bottom-right'
      style={{ position: 'absolute', bottom: 0, right: 0 }}
    />
    <div
      className='rmc__crop__corner-element rmc__crop__corner-element__bottom-left'
      style={{ position: 'absolute', bottom: 0, left: 0 }}
    />
  </>
);

const cropStyle = (box: CropperBox, style: CSSProperties): CSSProperties => {
  const { x, y, width, height } = box;

  return {
    ...style,
    transformOrigin: `${-box.x}px ${-box.y}px`,
    boxShadow: '0 0 0 2px #000',
    background: '#FFFFFF33',
    position: 'absolute',
    width,
    height,
    top: y,
    left: x,
    opacity: 0.8,
  };
};

export default Crop;
