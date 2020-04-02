import React, { FC } from 'react';
import css from './Icons.module.scss';

export const DeleteIcon: FC<any> = (props) => (
  <div className={css['icon-container']} {...props}>
    &times;
  </div>
);

export const NumberIcon: FC<{ number: number }> = ({ number }) => (
  <div className={css.number}>{number}</div>
);
