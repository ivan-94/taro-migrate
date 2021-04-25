const React = require('react');
const ReactDOM = require('react-dom');
const current = require('../current').default;

const Nerv = {};

Object.assign(Nerv, React, ReactDOM);

Nerv.nextTick = function (fn, ...args) {
  fn = typeof fn === 'function' ? fn.bind.apply(fn, args) : fn;
  if (typeof Promise !== 'undefined') {
    return Promise.resolve().then(fn);
  }
  const timerFunc = typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : setTimeout;
  timerFunc(fn);
};

// Current & getHooks
const Current = (Nerv.Current = current);

Nerv.getHooks = function getHooks(index) {
  if (Current.current === null) {
    throw new Error(`invalid hooks call: hooks can only be called in a stateless component.`);
  }
  const hooks = Current.current.hooks;
  if (index >= hooks.length) {
    hooks.push({});
  }
  return hooks[index];
};

// PropTypes
const noop = () => {};
const shim = noop;
shim.isRequired = noop;
function getShim() {
  return shim;
}
const PropTypes = {
  array: shim,
  bool: shim,
  func: shim,
  number: shim,
  object: shim,
  string: shim,
  any: shim,
  arrayOf: getShim,
  element: shim,
  instanceOf: getShim,
  node: shim,
  objectOf: getShim,
  oneOf: getShim,
  oneOfType: getShim,
  shape: getShim,
  exact: getShim,
  PropTypes: {},
  checkPropTypes: noop,
};
PropTypes.PropTypes = PropTypes;
Nerv.PropTypes = PropTypes;

Nerv.default = Nerv;

module.exports = Nerv;
