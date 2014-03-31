describe ('clumber', function() {

  it('should create an lib instance', function (){
    expect(Clumber).not.toBe(undefined);
  });

  describe('instrumenting functions', function() {

    it('returns same function when no instrumentation done', function() {
      var toInstrument = function (a, b) { return a + b; };

      var instrumented = Clumber.plumbFunction(toInstrument).setup();

      expect(instrumented).toBe(toInstrument);
    });

    it('can replace function with new function and release using original on handler', function(){
      var toInstrument = function (a, b) { return a + b; };
      var replacementF = function (a, b) { return a - b; };

      var handler = Clumber.plumbFunction(toInstrument)
        .replace(replacementF);

      var instrumented = handler.setup();
      expect(instrumented).toBe(replacementF);
      expect(instrumented(4, 3)).toBe(1);

      // restore the original func.
      var original = handler.original();
      expect(original).toBe(toInstrument);
      expect(original(4, 3)).toBe(7);
    });

    it('can wrap the function', function() {
      var callInc = 0;
      var toInstrument = function (a) { callInc++; return a*a; };

      var instrumented = Clumber.plumbFunction(toInstrument)
        .plumbWrapper(
          function(func, a) {
            var r ;
            for (var i=0; i < a; i++) {
              r = func.call(this, a);
            }
            return r;
          }
        ).setup();

      expect(instrumented(3)).toBe(9);

      expect(callInc).toBe(3); // instrumented fce called 3 times
    });

    it('can plumb in function to inspect the call before', function() {
      var calls = [];
      var toInstrument = function (a, b) { calls.push('orig'); return a + b; };
      var sA, sB;

      var instrumented = Clumber.plumbFunction(toInstrument)
        .plumbBefore(
          function(a, b) {
            calls.push('before');
            sA = a;
            sB = b;
          }
        ).setup();

      expect(instrumented(2, 3)).toBe(5);

      expect(calls).toEqual(['before','orig']);
      expect(sA).toBe(2);
      expect(sB).toBe(3);

    });

    it('can plumb in function before the call to mutate arguments', function() {
      var sA, sB;
      var toInstrument = function (a, b) { return a + b; };

      var instrumented = Clumber.plumbFunction(toInstrument)
        .plumbBefore(
          function(a, b) { //all arguments *2
            sA = a;
            sB = b;
            return [a * 2, b * 2];
          },
          true // - set the before func. to be mutable
        ).setup();

      expect(instrumented(2, 3)).toBe(10); // (2 * 2) + (2 * 3)
      expect(sA).toBe(2);
      expect(sB).toBe(3);

    });

    it('can plumb in a function to inspect the result after the call', function() {
      var calls = [];
      var toInstrument = function (a, b) {calls.push('orig'); return 'A='+a+' B='+b;};
      var sA, sB, sRet;

      var instrumented = Clumber.plumbFunction(toInstrument)
        .plumbAfter(
          function(a, b, ret) {
            calls.push('after');
            sA = a;
            sB = b;
            sRet = ret;
          }
        ).setup();

      expect(instrumented(1,2)).toBe('A=1 B=2');

      expect(calls).toEqual(['orig','after']);

      expect(sA).toBe(1);
      expect(sB).toBe(2);
      expect(sRet).toBe('A=1 B=2');

    });

    it('can plumb in a function to mutate the result after the call', function() {
      var toInstrument = function (a, b) { return 'A='+a+' B='+b;};
      var sA, sB, sRet;

      var instrumented = Clumber.plumbFunction(toInstrument)
        .plumbAfter(
          function(a, b, ret) {
            sA = a;
            sB = b;
            sRet = ret;
            return '(' + ret + ')';
          }, true
        ).setup();

      expect(instrumented(1,2)).toBe('(A=1 B=2)');

      expect(sA).toBe(1);
      expect(sB).toBe(2);
      expect(sRet).toBe('A=1 B=2');
    });

    it('can plumb in both before / after to mutate arguments and result', function(){
      var calls = [];
      var toInstrument = function(a, b) { calls.push('orig'); return a + ',' + b; };
      var bA, bB, aA, aB, aR;

      var handler = Clumber.plumbFunction(toInstrument)
        .plumbBefore(
          function(a, b) {
            calls.push('before');
            bA = a; bB = b;
            return [a*2, b*2];
          }, true
        )
        .plumbAfter(
          function(a, b, ret) {
            calls.push('after');
            aA=a; aB = b; aR = ret;
            return '[' + ret + ']';
          }, true
        );
      var instrumented = handler.setup();

      expect(instrumented(2,4)).toBe('[4,8]');
      expect(calls).toEqual(['before','orig','after']);
      expect([bA, bB, aA, aB, aR]).toEqual([2, 4, 4, 8, '4,8']);

      // check with replaced function
      instrumented = handler.replace(function(a, b) { calls.push('replace'); return a + '-' + b;}).setup();
      calls = [];

      expect(instrumented(2,4)).toBe('[4-8]');
      expect(calls).toEqual(['before','replace','after']);
      expect([bA, bB, aA, aB, aR]).toEqual([2, 4, 4, 8, '4-8']);

      // check to restore original
      var orig = handler.original();
      calls = [];

      expect(orig(2, 4)).toBe('2,4');
      expect(calls).toEqual(['orig']);
    });


  }); // plumbFunction suit

  describe('instrumenting classes', function() {

    function _testClassAnimal() {
      function Animal(name) {
        this.name = name;
      }

      Animal.prototype.move = function(meters) {
        return (this.name + ' moved ' + meters + 'm.');
      };

      return Animal;
    }

    it('replaces and releases original prototype function with instrumenting one, functionality unchanged', function() {
      var Animal = _testClassAnimal();

      var cat = new Animal('cat');

      var origFunc = Animal.prototype.move;

      var expectRes = 'cat moved 5m.';

      expect(Animal.prototype.move).toEqual(origFunc);
      expect(cat.move).toEqual(origFunc);
      expect(cat.move(5)).toEqual(expectRes);

      //instrument - without plumbing won't change the prototype
      var ifunc = Clumber.plumb(Animal.prototype, 'move').install();

      expect(Animal.prototype.move).toEqual(origFunc);
      expect(cat.move).toEqual(origFunc);
      expect(cat.move(5)).toEqual(expectRes);

      //release instrumented function
      ifunc.release();

      expect(Animal.prototype.move).toEqual(origFunc);
      expect(cat.move).toEqual(origFunc);
      expect(cat.move(5)).toEqual(expectRes);

      //repeated release has same impact
      ifunc.release();

      expect(Animal.prototype.move).toEqual(origFunc);
      expect(cat.move).toEqual(origFunc);
      expect(cat.move(5)).toEqual(expectRes);

    });

    it('allows to replace and release with new function', function() {
      var Animal = _testClassAnimal();

      var cat = new Animal('cat');

      var expectOrigRes = 'cat moved 5m.';

      expect(cat.move(5)).toEqual(expectOrigRes);

      //instrument
      var ifunc = Clumber.plumb(Animal.prototype, 'move')
        // and replace with new
        .replace(
          function(inches) {
            return (this.name + ' moved ' + inches + 'inches.');
          }
        ).install();

      expect(cat.move(5)).toEqual('cat moved 5inches.');

      //release instrumented function
      ifunc.release();

      expect(cat.move(5)).toEqual(expectOrigRes);
    });

    it('can instrument instance instead of prototype', function() {
      var Animal = _testClassAnimal();

      var cat = new Animal('cat');
      var dog = new Animal('dog');

      Clumber.plumb(dog, 'move').replace(
          function(inches) {
            return (this.name + ' crawled ' + inches + 'inches.');
          }
        ).install();

      expect(cat.move(1)).toBe('cat moved 1m.');

      expect(dog.move(10)).toBe('dog crawled 10inches.');
    });

    it('allows to replace and release with new function', function() {
      var Animal = _testClassAnimal();

      var cat = new Animal('cat');

      var ifunc = Clumber.plumb(Animal.prototype, 'move')
        .plumbAfter(
          function(meters, ret) {
            return '<p>' + ret +'</p>';
          },true
        ).install();

      expect(cat.move(10)).toBe('<p>cat moved 10m.</p>');
    });

    it('wraps object function', function(){
      var Animal = _testClassAnimal();

      var dog = new Animal('dog');

      var ifunc = Clumber.plumb(Animal.prototype, 'move')
        .plumbWrapper(
          function(func, meters) {
            var ret = func(meters); //should be bound, won't req. : func.call(this, meters);
            return (meters < 10) ? ret :
              (ret + ' - It is too long for ' + this.name);
          }
        ).install();
      expect(dog.move(5)).toBe('dog moved 5m.');
      expect(dog.move(10)).toBe('dog moved 10m. - It is too long for dog');
    });

  });

  describe('test specific use cases', function(){

    it('can be used to instrument function to instrument function', function () {

      var TestClass = (function() {
        function TestClass() {
          this.action = null;
        }

        TestClass.prototype.registerAction = function(name, action) {
          this.action = action;
        };

        TestClass.prototype.executeAction = function(name) {
          return this.action(name);
        };

        return TestClass;
      })();

      var testObj = new TestClass();

      function testAccessBlock(base) {
        return 2 * base;
      }

      function addTestCase (actionName, accessBlock, base) {
        // function to be instrumented when registered with TestClass
        var action = function(varName) {
          return varName + '=' + accessBlock(base);
        };

        testObj.registerAction(actionName, action);
      }

      // test un-instrumented
      addTestCase('test', testAccessBlock, 11);
      expect(testObj.executeAction('A')).toEqual('A=22');

      // test instrumented
      testObj = new TestClass(); // reset
      var actionAdded = null;
      var retValRegistered = null;

      // instrument TestClass to instrument registered action
      Clumber.plumb(TestClass.prototype, 'registerAction')
        .plumbBefore (
          function(actionName, action) {
            actionAdded = actionName;
            // instrumenting the added action
            action = Clumber.plumbFunction(action)
              .plumbAfter(
                function(name, retVal) {
                  retValRegistered = retVal;
                }
              ).setup();
            return [actionName, action];
          }, true
        )
        .install();

      addTestCase('test', testAccessBlock, 11);
      expect(testObj.executeAction('A')).toEqual('A=22');
      expect(actionAdded).toBe('test');
      expect(retValRegistered).toBe('A=22');

    });

  });


  describe('utility functions', function() {

    describe('handling the after function arguments array', function() {

      it('can use getAfterReturnValue to retrieve the return value from the arguments passed', function() {

        function testToGetAfterReturnValue() {
          return Clumber.getAfterReturnValue(arguments);
        }

        var retVal = 123;

        expect(testToGetAfterReturnValue(1, 2, 3, retVal)).toEqual(retVal);

        expect(testToGetAfterReturnValue(1, 2, 3, 4, 5, 6, 7, retVal)).toEqual(retVal);

        // edge cases

        expect(testToGetAfterReturnValue()).toBe(undefined);

        expect(testToGetAfterReturnValue(retVal)).toEqual(retVal);

      });

      it('can use getAfterArguments to retrieve the arguments for the function', function() {

        function testToGetAfterArguments() {
          return Clumber.getAfterArguments(arguments);
        }

        expect(testToGetAfterArguments(1, 2, 3, 123)).toEqual([1, 2, 3]);

        // edge cases

        expect(testToGetAfterArguments(123)).toEqual([]);

        expect(testToGetAfterArguments()).toEqual([]);

      });

      it('can use getWrapperArguments to get arguments in wrapper function', function(){
        function testToGetWrapperArguments() {
          return Clumber.getWrapperArguments(arguments);
        }

        var wrappedFunc = function() {};

        expect(testToGetWrapperArguments(wrappedFunc, 1, 2, 3)).toEqual([1, 2, 3]);
        expect(testToGetWrapperArguments(wrappedFunc)).toEqual([]);
        expect(testToGetWrapperArguments()).toEqual([]);
      });

      it('can use getWrapperArguments to get arguments in wrapper function', function(){
        function testToGetWrappedFunction() {
          return Clumber.getWrappedFunction(arguments);
        }

        var wrappedFunc = function() {};

        expect(testToGetWrappedFunction(wrappedFunc, 1, 2, 3)).toEqual(wrappedFunc);
        expect(testToGetWrappedFunction(wrappedFunc)).toEqual(wrappedFunc);
      });

    });

  });

});