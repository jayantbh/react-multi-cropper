import React, {
  CSSProperties,
  FC,
  memo,
  MouseEvent,
  useCallback,
  useMemo,
} from 'react';
import { BoxLabel } from './BoxLabel';
import { CropperBox, CropperEvent } from '../types';

type UpdateFunction = (
  event: CropperEvent,
  box: CropperBox | undefined,
  index: number | undefined
) => any;

type Props = {
  index: number;
  box: CropperBox;
  onDelete?: UpdateFunction;
  onBoxClick?: UpdateFunction;
  onBoxMouseEnter?: UpdateFunction;
  onBoxMouseLeave?: UpdateFunction;
  style?: CSSProperties;
  CustomLabel?: FC<{ box: CropperBox; index: number }>;
};

const Crop = memo(
  ({
    index,
    box,
    onDelete,
    onBoxClick,
    onBoxMouseEnter,
    onBoxMouseLeave,
    CustomLabel,
    style,
  }: Props) => {
    const handleDelete = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();

        onDelete?.({ type: 'delete', event: e }, box, index);
      },
      [index, box, onDelete]
    );

    const handleBoxMouseEnter = useCallback(
      (e: MouseEvent) => {
        onBoxMouseEnter?.({ type: 'mouse-enter', event: e }, box, index);
      },
      [onBoxMouseEnter, box, index]
    );

    const handleBoxMouseLeave = useCallback(
      (e: MouseEvent) => {
        onBoxMouseLeave?.({ type: 'mouse-leave', event: e }, box, index);
      },
      [onBoxMouseLeave, box, index]
    );

    const handleBoxClick = useCallback(
      (e: MouseEvent) => {
        onBoxClick?.({ type: 'click', event: e }, box, index);
      },
      [onBoxClick, box, index]
    );

    const labelStyle: CSSProperties = useMemo(
      () => ({ pointerEvents: 'initial', ...(box.labelStyle || {}) }),
      [box.labelStyle]
    );

    const containerStyles: CSSProperties = useMemo(
      () => ({
        ...cropStyle(box, style),
        pointerEvents: 'none',
      }),
      [box, style]
    );

    return (
      <div id={box.id} style={containerStyles} onClick={handleBoxClick}>
        <div
          style={labelWrapperStyles}
          onMouseEnter={handleBoxMouseEnter}
          onMouseLeave={handleBoxMouseLeave}
        >
          <BoxLabel onClick={handleDelete} style={labelStyle}>
            {CustomLabel ? <CustomLabel box={box} index={index} /> : null}
          </BoxLabel>
          <CornerPoints id={box.id} />
        </div>
      </div>
    );
  }
);

const cornerPointsStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
};
const CornerPoints = memo(({ id }: { id: string }) => (
  <div
    id={`rmc__crop__corner-element__top-left__${id}`}
    style={cornerPointsStyle}
  />
));

const cropStyle = (
  box: CropperBox,
  style: CSSProperties = {}
): CSSProperties => {
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
