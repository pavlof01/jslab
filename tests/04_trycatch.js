function f(){
  try { throw 1; }
  catch(e){ return e + 1; }
}
f();
