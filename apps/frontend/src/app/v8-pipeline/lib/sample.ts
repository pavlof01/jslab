export const PIPELINE_SAMPLE = `function add(a, b) {
  return a + b;
}

for (let i = 0; i < 400; i++) add(i, i + 1);

// uncomment to enable maglev opt
// for (let i = 0; i < 500; i++) add(i, i + 1);

// uncomment to enable sparkplug opt
// for (let i = 0; i < 10001; i++) add(i, i + 1);

// uncomment to enable force opt
// %PrepareFunctionForOptimization(add);
// %OptimizeFunctionOnNextCall(add);

// add(1, 2)`;
