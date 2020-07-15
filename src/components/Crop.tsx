import React, { Component, CSSProperties, FC, MouseEvent } from 'react';
import { BoxLabel } from './BoxLabel';
import { remove } from '../utils';
import { CropperBox, UpdateFunction } from '../types';

type Props = {
  index: number;
  box: CropperBox;
  boxes: CropperBox[];
  onDelete?: UpdateFunction;
  onBoxClick?: UpdateFunction;
  onBoxMouseEnter?: UpdateFunction;
  onBoxMouseLeave?: UpdateFunction;
  style?: CSSProperties;
  CustomLabel?: FC<{ box: CropperBox; index: number }>;
};

class Crop extends Component<Props> {
  handleDelete = (e: MouseEvent) => {
    e.stopPropagation();

    const { index, box, onDelete, boxes } = this.props;
    const nextBoxes = remove(index, 1, boxes);
    onDelete?.({ type: 'delete', event: e }, box, index, nextBoxes);
  };

  handleBoxMouseEnter = (e: MouseEvent) => {
    const { onBoxMouseEnter, box, index, boxes } = this.props;
    onBoxMouseEnter?.({ type: 'mouse-enter', event: e }, box, index, boxes);
  };

  handleBoxMouseLeave = (e: MouseEvent) => {
    const { onBoxMouseEnter, box, index, boxes } = this.props;
    onBoxMouseEnter?.({ type: 'mouse-leave', event: e }, box, index, boxes);
  };

  handleBoxClick = (e: MouseEvent) => {
    const { onBoxClick, box, index, boxes } = this.props;
    onBoxClick?.({ type: 'click', event: e }, box, index, boxes);
  };

  render() {
    const { box, index, style = {}, CustomLabel } = this.props;
    const { labelStyle = {} } = box;
    return (
      <div
        id={box.id}
        style={{
          ...cropStyle(box, style),
          pointerEvents: 'none',
        }}
        onClick={this.handleBoxClick}
      >
        <div
          style={labelWrapperStyles}
          onMouseEnter={this.handleBoxMouseEnter}
          onMouseLeave={this.handleBoxMouseLeave}
        >
          <BoxLabel
            onClick={this.handleDelete}
            style={{ pointerEvents: 'initial', ...labelStyle }}
          >
            {CustomLabel ? <CustomLabel box={box} index={index} /> : null}
          </BoxLabel>
          {FourDivs}
        </div>
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
    width,
    height,
    top: y,
    left: x,
  };
};

const labelWrapperStyles: CSSProperties = {
  width: '100%',
  height: '100%',
  pointerEvents: 'auto',
};

export default Crop;
