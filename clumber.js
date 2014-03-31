/******************************************************************************
 * Clumber = Code Plumber - lib to instrument the JS code in the aspect like fashion
 *  define functions to run before and after, replace or wrapper the original
 *  function.
 *  Author: Martin Havelka, Salsita Software
 *****************************************************************************/

(function () {

  function _callBefore(self, beforeFunc, args) {
    beforeFunc.apply(self, args);
    return args;
  }

  function _callBeforeMutating(self, beforeFunc, args) {
    var newArgs = beforeFunc.apply(self, args);
    return newArgs;
  }

  function _callAfter(self, afterFunc, args, returnVal) {
    var afterArgs = Array.prototype.slice.call(args, 0);
    afterArgs.push(returnVal);
    afterFunc.apply(self, afterArgs);
    return returnVal;
  }

  function _callAfterMutating(self, afterFunc, args, returnVal) {
    var afterArgs = Array.prototype.slice.call(args, 0);
    afterArgs.push(returnVal);
    return afterFunc.apply(self, afterArgs);
  }

  var Clumber = {
    /**
     * Create plumbing for specified function
     * @param {Function} function to plumb
     * @return plumbing for given function
     */
    plumbFunction: function (func) {
      var origFunc = func;
      var execFunc = func;
      var beforeFunc, afterFunc, wrapperFunc;
      var beforeCall, afterCall;

      // return handler to chain the plumbing
      return {
        /**
         * Set new function to replace the original one.
         * @param {Function} replacement function
         * @return handler to chain the plumbing
         */
        replace: function (func) {
          execFunc = func;
          return this;
        },

        /**
         * Connect in function before the original/replacement function.
         * The function should use same arguments as the original func.
         * or use the arguments object. Mutating flag determines if the
         * before function will mutate the function arguments.
         * The before has to return array of new arguments to be passed
         * to the executed function.
         * @param {Function} - a function to be called before the
         *                     origininal / replacement func.
         * @param {boolean} - a flag to determine if the before function
         *                    is going to mutate the function arguments
         * @return handler to chain the plumbing
         */
        plumbBefore: function (func, mutating) {
          beforeFunc = func;
          beforeCall = mutating ? _callBeforeMutating : _callBefore;
          return this;
        },

        /**
         * Connect in function before he original/replacement function.
         * The function should use same arguments as the original func.
         * or use the arguments object. Mutating flag determines if the
         * before function will mutate the function arguments.
         * The before has to return array of new arguments to be passed
         * to the executed function.
         * @param {Function} - a function to be called after the
         *                     origininal / replacement func.
         * @param {boolean} - a flag to determine if the after function
         *                    is going to mutate the returned value
         * @return handler to chain the plumbing
         */
        plumbAfter: function (func, mutating) {
          afterFunc = func;
          afterCall = mutating ? _callAfterMutating : _callAfter;
          return this;
        },

        /**
         * Instrument in a wrapper function for the original / replacement
         * function. It will override any before and/or after function specified.
         * The wrapper function
         *   function (wrappedFunc, arg, arg2, ...) {
         *     func.call(this, arg1, arg2, ...);
         *   }
         * @param {Function} wrapper function
         * @return {Object} handler to chain the plumbing
         */
        plumbWrapper: function (func) {
          wrapperFunc = func;
          return this;
        },

        /**
         * Returns the original plumbed function to restore it.
         * @return {Function} original function
         */
        original: function () {
          return origFunc;
        },

        /**
         * Creates and return the finished function plumbing.
         * @return {Function} finished - plumbed function assembly
         */
        setup: function() {
          return (wrapperFunc) ? // wrapper overrides any before / after
            function () {
              var args = Array.prototype.slice.call(arguments, 0);
              args.splice(0, 0, execFunc.bind(this));
              return wrapperFunc.apply(this, args);
            } :
            (beforeFunc) ?
              (afterFunc) ?
                function() { // before + after
                  var args = beforeCall(this, beforeFunc, arguments);
                  var ret = execFunc.apply(this, args);
                  return afterCall(this, afterFunc, args, ret);
                } :
                function() { // before
                  var args = beforeCall(this, beforeFunc, arguments);
                  return execFunc.apply(this, args);
                } :
              (afterFunc) ?
                function() { // after
                  var ret = execFunc.apply(this, arguments);
                  return afterCall(this, afterFunc, arguments, ret);
                } :
                execFunc; // no before / after
        }
      };
    }, // plumbFunction

    /**
     * Instruments specified function of the object/prototype
     * @param {Object} object / prototype to instrument
     * @param {String} name of the function to instrument
     * @return returns instrumentation handler to chain the plumbing
     */
    plumb: function (obj, func) {
      var funcHandler = Clumber.plumbFunction(obj[func]);

      /**
       * Initiates the created plumbing and installs it
       * in the object / prototype function.
       * @return {Object} handler to chain the plumbing
       */
      funcHandler.install = function() {
        obj[func] = funcHandler.setup();
        return funcHandler;
      };

      /**
       * Releases the created plumbing and restores original
       * object / prototype function.
       * @return {Object} handler to chain the plumbing
       */
      funcHandler.release = function() {
        obj[func] = funcHandler.original();
        return funcHandler;
      };

      return funcHandler;
    }, // plumb

    /**
     * Utility function to return last argument in the after functions
     *  that is the return value of the plumbed function.
     * @param {Array} function arguments array to get the last value from.
     * @return - the last value
     */
    getAfterReturnValue: function (args) {
      return Array.prototype.slice.call(args, -1)[0];
    },

    /**
     * Utility to return arguments only in the after functions - all except last one.
     * @param {Array} function arguments array to get arguments elements from
     * @return {Array} - array of arguments
     */
    getAfterArguments: function (args) {
      return Array.prototype.slice.call(args, 0, -1);
    },

    /**
     * Utility to return arguments only in the wrapper functions 
     *  - tail after the 1st arg. - the wrapped function
     * @param {Array} function arguments array to get arguments elements from
     * @return {Array} - array of arguments
     */
    getWrapperArguments: function (args) {
      return Array.prototype.slice.call(args, 1);
    },

    /**
     * Utility to return wrapped function only in the wrapper functions - 1st argument.
     * @param {Array} function arguments array to get wrapped function from
     * @return {Function} - wrapped function
     */
    getWrappedFunction: function (args) {
      return Array.prototype.slice.call(args, 0, 1)[0];
    }

  }; // Clumber def.

  // Expose the Clumber
  // TODO: can use more sophisticated way to get the root
  var root = window || this;
  // TODO: adapt the expose to AMD modules and/or exports
  root.Clumber = Clumber;

  // TODO: might need a mean to resolve conflicts (ie. noConflict func.)

}).call(this);
