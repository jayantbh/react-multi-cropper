import React, { FC, HTMLAttributes, useRef, useState } from 'react';

import css from './ScrollBar.module.scss';

type ScrollType = 'horizontal' | 'vertical';
type ScrollbarProps = {
  type: ScrollType;
  onScroll: (difference: number) => any;
};

const Scrollbar: FC<
  Omit<HTMLAttributes<HTMLDivElement>, 'onScroll'> & ScrollbarProps
> = ({ onScroll, type, ...props }) => {
  const isVertical = type === 'vertical';

  const [isScrolling, setScroll] = useState(false);
  const prevPos = useRef(0);
  const scrollFrame = useRef(-1);

  return (
    <div
      className={css['scroll-wrapper']}
      style={{
        pointerEvents: isScrolling ? 'initial' : 'none',
        cursor: isVertical ? 'ns-resize' : 'ew-resize',
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
          pointerEvents: 'initial',
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
