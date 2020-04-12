import React, { FC, HTMLAttributes } from 'react';
import css from './Icons.module.scss';

export const DeleteIcon: FC<HTMLAttributes<HTMLDivElement>> = (props) => (
  <div className={css['icon-container']} {...props}>
    &times;
  </div>
);

export const NumberIcon: FC<
  HTMLAttributes<HTMLDivElement> & { number: number }
> = ({ number, ...props }) => (
  <div {...props} className={`${css.number} ${props.className}`}>
    {number}
  </div>
);
