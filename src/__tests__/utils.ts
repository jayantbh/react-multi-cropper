import { deepEquals, oneLevelEquals, remove, update } from '../utils';

describe('update util', () => {
  it('should update an item in the middle', function () {
    const arr = [1, 2, 3, 4, 5];
    const new_arr = update(2, 10, arr);
    expect(new_arr[2]).toBe(10);
    expect(new_arr).toHaveLength(arr.length);
    expect(new_arr !== arr).toBeTruthy();
  });

  it('should update an item at the start', function () {
    const arr = [1, 2, 3, 4, 5];
    const new_arr = update(0, 10, arr);
    expect(new_arr[0]).toBe(10);
    expect(new_arr).toHaveLength(arr.length);
    expect(new_arr !== arr).toBeTruthy();
  });

  it('should update an item at the end', function () {
    const arr = [1, 2, 3, 4, 5];
    const new_arr = update(4, 10, arr);
    expect(new_arr[4]).toBe(10);
    expect(new_arr).toHaveLength(arr.length);
    expect(new_arr !== arr).toBeTruthy();
  });
});

describe('remove util', () => {
  it('should remove an item in the middle', function () {
    const arr = [1, 2, 3, 4, 5];
    const new_arr = remove(2, 1, arr);
    expect(new_arr[2]).toBe(4);
    expect(new_arr).toHaveLength(arr.length - 1);
    expect(new_arr !== arr).toBeTruthy();
  });

  it('should remove items at the start', function () {
    const arr = [1, 2, 3, 4, 5];
    const new_arr = remove(0, 2, arr);
    expect(new_arr[0]).toBe(3);
    expect(new_arr).toHaveLength(arr.length - 2);
    expect(new_arr !== arr).toBeTruthy();
  });

  it('should remove items at the end', function () {
    const arr = [1, 2, 3, 4, 5];
    const new_arr = remove(3, 2, arr);
    expect(new_arr[3]).toBeUndefined();
    expect(new_arr).toHaveLength(arr.length - 2);
    expect(new_arr !== arr).toBeTruthy();
  });
});

describe('one level deep equals util', () => {
  it('should check for primitives equality', function () {
    const a = { a: 1, b: 2 };
    const b = { b: 2, a: 1 };

    expect(oneLevelEquals(a, b)).toBeTruthy();
  });

  it('should check for complex types equality', function () {
    const fn = () => {};
    const obj = { lol: 'haha' };
    const a = { obj, a: 1, b: 2, fn };
    const b = { b: 2, fn, a: 1, obj };

    expect(oneLevelEquals(a, b)).toBeTruthy();
  });

  it('should fail for mismatches', function () {
    const fn = () => {};
    const obj = { lol: 'haha' };
    const a = { obj, a: 1, b: 2, fn };
    const b = { obj, a: '1', b: (2).toString(), fn: 'fn' };

    expect(oneLevelEquals(a, b)).toBeFalsy();
  });

  it('should fail for nested objects', function () {
    const obj = { lol: 'haha' };
    const a = { obj, a: 1, x: { y: 1 } };
    const b = { obj, a: 1, x: { y: 1 } };

    expect(oneLevelEquals(a, b)).toBeFalsy();
  });
});

describe('multi level deep equals util', () => {
  it('should check for primitives equality', function () {
    const a = { a: 1, b: 2 };
    const b = { b: 2, a: 1 };

    expect(deepEquals(a, b)).toBeTruthy();
  });

  it('should check for complex types equality', function () {
    const fn = () => {};
    const obj = { lol: 'haha' };
    const a = { obj, a: 1, b: 2, fn };
    const b = { b: 2, fn, a: 1, obj };

    expect(deepEquals(a, b)).toBeTruthy();
  });

  it('should fail for mismatches', function () {
    const fn = () => {};
    const obj = { lol: 'haha' };
    const a = { obj, a: 1, b: 2, fn };
    const b = { obj, a: '1', b: (2).toString(), fn: 'fn' };

    expect(deepEquals(a, b)).toBeFalsy();
  });

  it('should pass for nested objects', function () {
    const obj = { lol: 'haha' };
    const a = { obj, a: 1, x: { y: 1 } };
    const b = { obj, a: 1, x: { y: 1 } };

    expect(deepEquals(a, b)).toBeTruthy();
  });
});
