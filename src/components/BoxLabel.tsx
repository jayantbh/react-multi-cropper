import React, { FC, HTMLAttributes } from 'react';
import css from './Icons.module.scss';

const CrossIcon = (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    height='24'
    width='24'
    viewBox='0 0 24 24'
  >
    <path d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' />
  </svg>
);

export const BoxLabel: FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  onClick,
  ...props
}) => {
  return (
    <div {...props} className={`${css['box-label']} ${props.className && css[props.className] || ''}`}>
      <div className={css.label}>{children}</div>
      <div className={css.cross} onClick={onClick}>
        {CrossIcon}
      </div>
    </div>
  );
};
