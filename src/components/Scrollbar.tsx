import React, { FC, HTMLAttributes, useRef, useState } from 'react';

import css from './Scrollbar.module.scss';

type ScrollType = 'horizontal' | 'vertical';
type ScrollbarProps = {
  type: ScrollType;
  onScroll: (difference: number) => any;
  isHidden?: boolean;
};

const Scrollbar: FC<
  Omit<HTMLAttributes<HTMLDivElement>, 'onScroll'> & ScrollbarProps
> = ({ onScroll, type, isHidden, ...props }) => {
  const isVertical = type === 'vertical';

  const [isScrolling, setScroll] = useState(false);
  const prevPos = useRef(0);
  const scrollFrame = useRef(-1);

  const accessBars = isScrolling ? true : !isHidden;

  return (
    <div
      className={css['scroll-wrapper']}
      style={{
        pointerEvents: accessBars ? 'initial' : 'none',
        cursor: isVertical ? 'ns-resize' : 'ew-resize',
        opacity: accessBars ? 1 : 0,
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setScroll(false);
      }}
      onMouseLeave={() => setScroll(false)}
      onMouseMove={(e) => {
        if (!isScrolling) return;
        const { clientX, clientY } = e;

        cancelAnimationFrame(scrollFrame.current);
        scrollFrame.current = requestAnimationFrame(() => {
          const difference = prevPos.current - (isVertical ? clientY : clientX);
          onScroll(difference);

          prevPos.current = isVertical ? clientY : clientX;
        });
      }}
    >
      <div
        {...props}
        className={`${isVertical ? css.vscroll : css.hscroll} ${css.scrollbar}`}
        style={{
          ...props.style,
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          prevPos.current = isVertical ? e.clientY : e.clientX;
          setScroll(true);
        }}
      />
    </div>
  );
};

export default Scrollbar;
