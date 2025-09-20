function f(x) {
  function C() {}
  C.prototype.m = function (y) {
    return y * 2;
  };
  const c = new C();
  return c.m(x);
}
f(21);
