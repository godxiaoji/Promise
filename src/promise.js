/**
 * Promise for browser
 * @Author  Travis [godxiaoji@gmail.com]
 * @version 1.0.0
 * 
 * @see http://www.ituring.com.cn/article/66566
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
 */

// Module definition pattern used is returnExports from https://github.com/umdjs/umd
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.EventEmitter = factory();
    }
}(typeof self !== 'undefined' ? self : this, (function () {
    'use strict';

    function isThenable(obj) {
        return obj && isFunction(obj.then);
    }

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    var PENDING = 0,
        FULFILLED = 1,
        REJECTED = 2;

    var Promise = function (resolver) {
        var self = this;
        this._status = PENDING;
        this._value;
        this._reason;
        this._resolves = [];
        this._rejects = [];

        var resolve = function (value) {
            self._status = FULFILLED;
            self._value = value;
            for (var i = 0; i < self._resolves.length; i++) {
                self._resolves[i](self._value);
            }
        };
        var reject = function (reason) {
            self._status = REJECTED;
            self._reason = reason;
            for (var i = 0; i < self._rejects.length; i++) {
                self._rejects[i](self._reason);
            }
        };

        resolver(resolve, reject);
    };

    Promise.resolve = function (value) {
        return new Promise(function (resolve, reject) {
            resolve(value);
        });
    };

    Promise.reject = function (reason) {
        return new Promise(function (resolve, reject) {
            reject(reason);
        });
    };

    Promise.all = function (promises) {
        return new Promise(function (resolve, reject) {
            var values = [],
                i = 0,
                j = 0,
                len = promises.length,
                p;

            function then(p, i) {
                p.then(function (value) {
                    values[i] = value;
                    if (++j >= len) {
                        resolve(values);
                    }
                }, function (reason) {
                    reject(reason);
                });
            }

            for (; i < len; i++) {
                p = promises[i];
                if (p instanceof Promise) {
                    then(p, i);
                } else {
                    values[i] = p;
                    if (++j >= len) {
                        resolve(values);
                    }
                }
            }
        });
    };

    Promise.race = function (promises) {
        return new Promise(function (resolve, reject) {
            var values = [],
                i = 0,
                sign = 0,
                len = promises.length,
                p;

            for (; i < len; i++) {
                p = promises[i];
                if (p instanceof Promise) {
                    p.then(function (value) {
                        if (!sign) {
                            sign = 1;
                            resolve(value);
                        }
                    }, function (reason) {
                        if (!sign) {
                            sign = 1;
                            reject(reason);
                        }
                    });
                } else {
                    if (!sign) {
                        sign = 1;
                        resolve(p);
                    }
                }
            }
        });
    };

    Promise.prototype = {
        then: function (onFulfilled, onRejected) {
            var self = this;

            return new Promise(function (resolve, reject) {
                function callback(value) {
                    var ret = value;
                    if (isFunction(onFulfilled)) {
                        try {
                            // 成功函数执行报错，也会载入catch中
                            ret = onFulfilled(value);
                        } catch (e) {
                            reject(e);
                            return;
                        }
                    }
                    if (isThenable(ret)) {
                        ret.then(function (value) {
                            resolve(value);
                        }, function (reason) {
                            reject(reason);
                        });
                    } else {
                        resolve(ret);
                    }
                }

                function errback(reason) {
                    var ret = isFunction(onRejected) ? onRejected(reason) : reason;
                    reject(ret);
                }

                if (self._status === PENDING) {
                    self._resolves.push(callback);
                    self._rejects.push(errback);
                } else if (self._status === FULFILLED) {
                    callback(self._value);
                } else if (self._status === REJECTED) {
                    errback(self._reason);
                }
            });

        },
        'catch': function (fn) {
            return this.then(null, fn);
        }
    };

    return Promise;
})));