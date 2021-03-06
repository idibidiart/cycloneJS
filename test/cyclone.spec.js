'use strict';

/**
 * CycloneJS Unit Tests.
 */
var CY = require('../cyclone.js');
var expect = global.expect;

describe('cycloneJS', function() {
  var original, val, clone;

  // http://stackoverflow.com/questions/10776600/
  // testing-for-equality-of-regular-expressions
  function _isRegexEqual(r1, r2) {
    var props;
    var prop;
    if (r1 instanceof RegExp && r2 instanceof RegExp) {
      props = ['global', 'multiline', 'ignoreCase', 'source'];
      for (var i = 0; i < props.length; i++) {
        prop = props[i];
          if (r1[prop] !== r2[prop]) {
            return false;
          }
        }
      return true;
    }
    return false;
  }

  beforeEach(function() {
    val = 0;
    /*jshint -W053 */
    original = {
      number: Math.random(),
      bool: false,
      string: 'hello!',
      date: new Date(),
      numberObj: new Number(1),
      boolObj: new Boolean(true),
      stringObj: new String('hey'),
      regex: /^someRE$/gim,
      regexNoFlags: /lookMaNoFlags/,
      array: [1, 2, {buckleMy: 'shoe'}],
      object: {
        foo: 1,
        bar: 2,
        nested: {
          array: ['holy', 'moly']
        }
      }
    };

    Object.defineProperty(original, 'nonEnumerable', {
      value: 'sup',
      enumerable: false,
      writable: true,
      configurable: true
    });

    Object.defineProperty(original, 'accessor', {
      get: function() { return val; },
      set: function(v) { val = v; },
      configurable: true,
      enumerable: true
    });
  });

  describe('basic cloning functionality', function() {
    beforeEach(function() {
      clone = CY.clone(original);
    });

    it('creates a different object', function() {
      expect(clone).not.to.be(original);
    });

    describe('cloning primitives', function() {
      it('preserves number values', function() {
        expect(clone.number).to.be(original.number);
      });

      it('preserves boolean values', function() {
        expect(clone.bool).to.be(original.bool);
      });

      it('preserves string values', function() {
        expect(clone.string).to.be(original.string);
      });
    });

    describe('cloning object wrappers', function() {
      function _isClonedWrapper(w1, w2) {
        return (w1 !== w2 && w1.valueOf() === w2.valueOf());
      }

      it('clones number objects', function() {
        expect(
          _isClonedWrapper(original.numberObj, clone.numberObj)
        ).to.be(true);
      });

      it('clones regex objects', function() {
        expect(original.regex).not.to.be(clone.regex);
        expect(_isRegexEqual(original.regex, clone.regex)).to.be(true);
      });

      it('clones regex objects with no flags', function() {
        expect(original.regexNoFlags).not.to.be(clone.regexNoFlags);
        expect(
          _isRegexEqual(original.regexNoFlags, clone.regexNoFlags)
        ).to.be(true);
      });

      it('clones boolean objects', function() {
        expect(_isClonedWrapper(original.boolObj, clone.boolObj)).to.be(true);
      });

      it('clones string objects', function() {
        expect(
          _isClonedWrapper(original.stringObj, clone.stringObj)
        ).to.be(true);
      });
    });

    describe('cloning dates', function() {
      it('clones dates', function() {
        expect(original.date).not.to.be(clone.date);
      });

      it('preserves the same value from the original date', function() {
        expect(original.date.valueOf()).to.be(clone.date.valueOf());
      });
    });

    describe('cloning complex objects', function() {
      it('deep-clones arrays', function() {
        expect(original.array).not.to.be(clone.array);
        expect(original.array).to.eql(clone.array);

        expect(original.array[2]).not.to.be(clone.array[2]);
        expect(original.array[2]).to.eql(clone.array[2]);
      });

      it('deep-clones plain objects', function() {
        expect(original.object).not.to.be(clone.object);
        expect(original.object).to.eql(clone.object);

        expect(original.object.nested).not.to.be(clone.object.nested);
        expect(original.object.nested).to.eql(clone.object.nested);
      });

      it('GOES DEEPER!!!!', function() {
        // WE CAN GO DEEPER!
        expect(original.object.nested.array).not.to.be(
          clone.object.nested.array
        );
        expect(original.object.nested.array).to.eql(clone.object.nested.array);
      });

      it('throws an error if it doesn\'t know how to clone an object',
         function() {
        original.f = function() {};
        expect(function() {
          CY.clone(original);
        }).to.throwError();
      });
    });
  }); // Basic Functionality

  describe('Cyclic references', function() {
    beforeEach(function() {
      original.self = original;
      original.nestedSelf = {ref: original};  // ew
      clone = CY.clone(original);
    });

    it('clones cyclic references', function() {
      expect(original.self).not.to.be(clone.self);
      expect(clone.self).to.be(clone);
    });

    it('clones nested cyclic references', function() {
      expect(original.nestedSelf.ref).not.to.be(clone.nestedSelf.ref);
      expect(clone.nestedSelf.ref).to.be(clone);
    });
  });

  describe('ES5 Considerations', function() {
    it('clones non-enumerable properties', function() {
      expect(clone.nonEnumerable).to.be(original.nonEnumerable);
    });

    it('does *not* preserve descriptor values on copied properties ' +
       '(GH#11)', function() {
      expect(
        Object.getOwnPropertyDescriptor(clone, 'nonEnumerable').enumerable
      ).to.be(true);
    });

    it('can handle accessor properties', function() {
      expect(clone.accessor).to.be(0);
    });

    it('only assigns the value returned from the accessor by default ' +
       '(GH#11)', function() {
      clone.accessor = 10;
      expect(val).to.be(0);
    });
  });

  describe('Custom cloning procedures', function() {
    function Person(name) {
      this.name = name;
    }
    Person.prototype.greet = function() {
      return 'Hi! My name is ' + this.name;
    };
    var eminem;
    var theRealSlimShady;

    beforeEach(function() {
      eminem = 'The Real Shady';
      theRealSlimShady = new Person(eminem);
    });

    afterEach(function() {
      CY.clearCustomCloneProcedures();
    });

    it('allows clients to define custom cloning procedures', function() {
      CY.defineCloneProcedure({
        detect: function(obj) {
          return (obj instanceof Person && obj.name === eminem);
        },
        copy: function() {
          return new Person('Otha Slim Shady');
        }
      });

      var whackAssPretender = CY.clone(theRealSlimShady);
      expect(whackAssPretender).not.to.be(theRealSlimShady);
      expect(whackAssPretender.greet()).to.be('Hi! My name is Otha Slim Shady');
    });

    it('gives precedence to procs defined at a later time', function() {
      var detectFn = function(obj) {
        return (obj.name === eminem);
      };

      CY.defineCloneProcedure({
        detect: detectFn,
        copy: function() {
          return 'Kim';
        }
      });

      CY.defineCloneProcedure({
        detect: detectFn,
        copy: function() {
          return eminem;
        }
      });

      expect(CY.clone(theRealSlimShady)).to.be(eminem);
    });

    it('returns true on successful definition', function() {
      expect(CY.defineCloneProcedure({
        detect: function(obj) { return obj === true; },
        copy: function() { return 'true'; }
      })).to.be(true);
    });

    it('returns false on unsuccessful definition', function() {
      expect(CY.defineCloneProcedure({})).to.be(false);
    });

    it('will fail if an object isn\'t passed in', function() {
      expect(CY.defineCloneProcedure('herp')).to.be(false);
    });

    it('will only copy the procedure if detect() returns true', function() {
      var copy;
      CY.defineCloneProcedure({
        detect: function(obj) { return obj === true; },
        copy: function() { return 'not this'; }
      });
      copy = CY.clone({ foo: true });
      expect(copy.foo).to.be(true);
    });

    it('will fail if the object lacks a `detect` function', function() {
      expect(CY.defineCloneProcedure({
        detect: 'nope',
        copy: function() {}
      })).to.be(false);
    });

    it('will fail if the object lacks a `copy` function', function() {
      expect(CY.defineCloneProcedure({
        detect: function() {},
        copy: 'nope'
      })).to.be(false);
    });
  });

  describe('edge cases', function() {
    it('returns the value of a primitive if explicitly passed one', function() {
      expect(CY.clone(1)).to.be(1);
      expect(CY.clone('hey')).to.be('hey');
      expect(CY.clone(false)).to.be(false);
    });

    it('returns null when passed null', function() {
      expect(CY.clone(null)).to.be(null);
    });

    it('returns undefined when passed undefined', function() {
      expect(CY.clone(undefined)).to.be(undefined);
    });
  });

  describe('options for CY.clone', function() {

    it ('has a `preserveDescriptors` option that will copy property ' +
        'descriptors when set to true', function() {
      clone = CY.clone(original, { preserveDescriptors: true });
      expect(
        Object.getOwnPropertyDescriptor(clone, 'nonEnumerable').enumerable
      ).to.be(false);
    });

    it ('passes get/set accessor methods through when `preserveDescriptors` ' +
        'is set to true', function() {
      clone = CY.clone(original, { preserveDescriptors: true });
      clone.accessor = 10;
      expect(val).to.be(10);
    });

    it('has an `allowFunctions` option that will pass functions ' +
       'through', function() {
      var copy;
      original.f = function() {};
      copy = CY.clone(original, {
        allowFunctions: true
      });
      expect(original.f).to.be(copy.f);
    });

    it('has a `suppressErrors` option that will return null on bad clone ' +
       'instead of throwing an error', function() {
      original.f = function() {};
      expect(function() {
        CY.clone(original, {
          suppressErrors: true
        });
      }).to.not.throwException();
    });

    it('returns null if `suppressErrors` is true and an error ' +
       'is thrown', function() {
      original.f = function() {};
      expect(CY.clone(original, {suppressErrors: true})).to.be(null);
    });
  });

});
