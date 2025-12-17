(() => {
  function doMain() {
    function doSwitch(theParam) {
      var theResult = 0;
      switch (theParam) {
        case 1:
          theResult = 1;
          break;
        case 2:
          theResult = 2;
          break;
        case 3:
          theResult = 3;
          break;
        default:
          theResult = 4;
          break;
      }
      return theResult;
    }

    function doSwitch2(theParam) {
      var theResult = 0;
      switch (theParam) {
        case 1:
          return 1;
        case 2:
          return 2;
        case 3:
          return 3;
        default:
          return 4;
      }
      return theResult;
    }

    function doIf(theParam) {
      var theResult = 0;
      if (theParam === 1) {
        theResult = 1;
      } else if (theParam === 2) {
        theResult = 2;
      } else if (theParam === 3) {
        theResult = 3;
      } else {
        theResult = 4;
      }
      return theResult;
    }

    function doIf2(theParam) {
      var theResult = 0;
      if (theParam === 1) {
        theResult = 1;
        theResult = 2;
      } else if (theParam === 2) {
        theResult = 2;
      } else if (theParam === 3) {
        theResult = 3;
      } else {
        theResult = 4;
      }
      return theResult;
    }

    doSwitch(1);
    // % PrepareFunctionForOptimization( doSwitch );
    // doSwitch ( 1 );
    // % OptimizeFunctionOnNextCall( doSwitch );
    // doSwitch ( 1 );
    // doIf ( 1 );
    // % PrepareFunctionForOptimization ( doIf ); doIf ( 1 );
    // % OptimizeFunctionOnNextCall ( doIf );
    doIf(1);
  }
  doMain();
})();
