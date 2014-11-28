/* global window, global, Q, console, setTimeout */

(function (global) {
  'use strict';

  var STATES = {
    CLEAN: 0,
    RESOLVED: 1,
    REJECTED: 2
  };

  var nextTick = function (cb) {
    setTimeout(cb, 0);
  };

  function Promise() {
    this._state = STATES.CLEAN;
    this._done = null;
    this._fail = null;
    this._next = null;
  }

  Promise.prototype.then = function (successCb, errorCb) {
    this._next = new Promise();
    this._done = successCb;
    this._fail = errorCb;
    if (this._state === STATES.RESOLVED) {
      this._resolve(this._data);
    } else if (this._state === STATES.REJECTED) {
      this._reject(this._data);
    }
    return this._next;
  };

  Promise.prototype._resolve = function (data) {
    var resolve = function () {
      this._state = STATES.RESOLVED;
      this._data = data;
      try {
        if (typeof this._done === 'function') {
          data = this._done(data);
        }
        this._resolveNext(data);
      } catch (e) {
        this._rejectNext(e);
      }
      this._done = null;
    }.bind(this);
    nextTick(resolve);
  };

  Promise.prototype._reject = function (data) {
    var reject = function () {
      this._state = STATES.REJECTED;
      this._data = data;
      if (typeof this._fail === 'function') {
        data = this._fail(data);
      }
      this._resolveNext(data);
      this._fail = null;
    }.bind(this);
    nextTick(reject);
  };

  Promise.prototype._resolveNext = function (data) {
    if (this._next && this._next._done) {
      Q.when(data)
      .then(function (data) {
        return this._next._resolve(data);
      }.bind(this));
    }
  };

  Promise.prototype._rejectNext = function (data) {
    if (this._next && this._next._fail) {
      Q.when(data)
      .then(function (data) {
        return this._next._reject(data);
      }.bind(this));
    }
  };

  function Deferred() {
    this.promise = new Promise();
  }

  Deferred.prototype.resolve = function (data) {
    this.promise._resolve(data);
  };

  Deferred.prototype.reject = function (data) {
    this.promise._reject(data);
  };

  var Q = (function () {
    return {
      defer: function () {
        return new Deferred();
      },
      all: function (promises) {
        var arr = [],
            deferred = this.defer(),
            resolved = 0,
            done = false;
        if (!promises.length) {
          deferred.resolve([]);
        } else {
          promises.forEach(function (promise, i) {
            /* In case we have already rejected promise
             * we don't want to iterate over all other promises
             * since there is no way the transaction to be
             * successful.
             */
            if (done) {
              return;
            }
            promise.then(function (data) {
              arr[i] = data;
              resolved += 1;
              if (resolved >= promises.length) {
                deferred.resolve(arr);
                done = true;
              }
              return data;
            }, function (data) {
              deferred.reject(data);
              done = true;
              return data;
            });
          });
        }
        return deferred.promise;
      },
      when: function (data) {
        if (!(data instanceof Promise)) {
          var d = this.defer();
          nextTick(function () {
            d.resolve(data);
          });
          return d.promise;
        }
        return data;
      }
    };
  }());

  global.Q = Q;

}((typeof window === 'undefined') ? global : window));