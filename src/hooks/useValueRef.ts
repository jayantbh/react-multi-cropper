import { useRef } from 'react';

export default function useValueRef<T>(param: T): [T, (newVal: T) => T] {
  const ref = useRef(param);
  const value = ref.current;
  const setValue = (newVal: T) => (ref.current = newVal);

  return [value, setValue];
}
