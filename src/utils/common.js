export const setObjPropertyWithKeyTransformer =
  (obj) => (transformer) => (key) => (value) => {
    obj[transformer(key)] = value;

    return obj;
  };

export const trim = (str) => str.trim();

export const anyPass =
  (arr) =>
  (...args) =>
    arr.reduce((acc, fn) => (acc ? acc : fn(...args)), false);

export const eq = (a) => (b) => a === b;

export const mutateObj = (key) => (value) => (obj) => {
  obj[key] = value;

  return obj;
};

export const pick = (key) => (obj) => obj[key];

export const pipe = (fns) => (value) => fns.reduce((acc, fn) => fn(acc), value);
