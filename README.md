Code Plumber : lib to instrument the code and hook into it in aspect like fashion.

## Instrumenting the codebase with `clumber.js` lib

See: `clumber.js` for in-code documentation and `test/clumber.specs.js` for examples of use.


### Instrumenting function

Functions can be instrumented by passing the original function to `Clumber.plumbFunction` and getting the instrumented function upon call go the `.setup()`.

`.replace`, `.plumbBefore`, `.plumbAfter`, `.plumbWrapper` set functions to replace, to be called before and after and to wrap the original function. 

Based on the `mutable` flag the before / after functions can alter the function arguments and return value _(see `.plumbBefore` / `.plumbAfter` details below)_.

	var instrumentedFunction = Clumber.plumbFunction( functionToInstrument )
		[ .replace( replacementFunction ) ]
		[ .plumbBefore( replacementFunction, mutable ) ]
		[ .plumbAfter( replacementFunction, mutable ) ]
		[ .plumbWrapper( wrapperFunction ) ]
		.setup();


### Accessing the original function

	var keepHandler = Clumber.plumbFunction( functionToInstrument )
		[ .replace( replacementFunction ) ]
		... ;

	var instrumentedFunction = keepHandler.setup();

	...

	var originalFunction = keepHandler.original();


### Instrumenting objects / prototypes

Use `Clumber.plumb(...)`, providing either instance or prototype, and the name of the function to instrument.

Use same instrumentation as for functions.

Finish instrumentation by calling `install()`.

	var handler = Clumber.plumb( instance,  'functionName' )
		[ .replace( replacementFunction ) ]
		[ .plumbBefore( replacementFunction, mutable ) ]
		[ .plumbAfter( replacementFunction, mutable ) ]
		[ .plumbWrapper( wrapperFunction ) ]
		.install();

	var handler = Clumber.plumb( Class.prototype, 'functionName' )
		...
		.install();

### Releasing the object / prototype instrumentation

	...
	handler.release();
	...


### Replacing the function

	...
	.replace(
	  function (arg1, arg2, ...) {
		...
	  	return ...;
	  }
	)
	...

	...
	.replace(
	  function () {
		... // use arguments
	  	return ...;
	  }
	)
	...

### Before function

	...
	.plumbBefore(
	  function(arg1, arg2, ...) {
	  	... // or just use arguments
	  }
	)
	...

### Mutable Before function

	...
	.plumbBefore(
	  function(arg1, arg2, ...) {
	  	...
	  	return [arg1, arg2, ...];
	  		// must return arguments - can alter args
	  },
	  true // flag as mutable
	)
	...

	...
	.plumbBefore(
	  function() {
	  	... // can alter arguments
	  	return arguments;
	  		// must return arguments - can alter args
	  },
	  true // flag as mutable
	)
	...


### After function

	...
	.plumbAfter(
	  function(arg1, arg2, ..., returnValue) {
		...
	  }
	)
	...

	...
	.plumbAfter(
	  function() {
		// can use helper functions
		var args = Clumber.getAfterArguments(arguments);
		var returnValue = Clumber.getAfterReturnValue(arguments);
		...
	  }
	)
	...

### Mutable After function

	...
	.plumbAfter(
	  function(arg1, arg2, ..., returnValue) {
		...
		return returnValue; // must return the return value, can be modified
	  },
	  true // flag as mutable
	)
	...

	...
	.plumbAfter(
	  function() {
		// can use helper functions
		var args = Clumber.getAfterArguments(arguments);
		var returnValue = Clumber.getAfterReturnValue(arguments);
		...
		return returnValue; // must return the return value, can be modified
	  },
	  true // flag as mutable
	)
	...


### Wrapping function

	...
	.plumbWrapper(
	  function (wrappedFunction, arg1, arg2, ...) {
	  	var ret;
		...
		ret = wrappedFunction(arg1, arg2, ...); // bound to this
		...
	  	return ret;
	  }
	)
	...

	...
	.plumbWrapper(
	  function (wrappedFunction) {
	  	var ret;
		...
		ret = wrappedFunction.call(this, Clumber.getWrapperArguments(arguments));
		...
	  	return ret;
	  }
	)
	...

	...
	.plumbWrapper(
	  function () {
	  	var ret;
		...
		ret = Clumber.getWrappedFunction(arguments)
		  .call(this, Clumber.getWrapperArguments(arguments));
		...
	  	return ret;
	  }
	)
	...


** NOTE: When wrapping function any after or before functions are ignored. **


## Unit Testing

The codebase includes unit test for code instrumenting lib. `clumber.js`. Configuration is provided to run the tests using TestEm.

Install TestEM globally first:

	npm install testem -g

run:

	testem
