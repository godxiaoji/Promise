/**
 * Promise for browser
 * @Author  Travis [godxiaoji@gmail.com]
 * @version 1.0.2
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
        if (!root.Promise) {
            root.Promise = factory();
        }
        root.PromiseBrowser = factory();
    }
}(typeof self !== 'undefined' ? self : this, (function () {
    'use strict';

    function isThenable(obj) {
        return obj && isFunction(obj.then);
    }

    function isFunction(obj) {
        return typeof obj === 'function';
    }

    function handleCallback(self) {
        // 兼容浏览器版本，没有微任务，执行时间节点不准确
        clearTimeout(self._timer);
        self._timer = setTimeout(function () {
            if (self._callbacks.length > 0) {
                if (self._status === FULFILLED) {
                    // 兼容浏览器版本，没有微任务，执行时间节点不准确
                    handleCallback(self);
                    for (var i = 0; i < self._callbacks.length; i++) {
                        var item = self._callbacks[i];
                        if (item.type === TYPE_THEN) {
                            item.handler(self._value);
                        } else if (item.type === TYPE_FINALLY) {
                            item.handler();
                        }
                    }
                } else if (self._status === REJECTED) {
                    // var isCaughtError = false;
                    for (var i = 0; i < self._callbacks.length; i++) {
                        var item = self._callbacks[i];
                        if (item.type === TYPE_CATCH) {
                            item.handler(self._reason);

                            if (item.isCaughtError) {
                                isCaughtError = true;
                            }

                        } else if (item.type === TYPE_FINALLY) {
                            item.handler();
                        }
                    }

                    // if (!isCaughtError) {
                    //     clearTimeout(self._timer);
                    //     self._timer = setTimeout(function () {
                    //         throw new Error('(in Promise) ' + self._reason);
                    //     });
                    // }
                }
                self._callbacks = [];
            }
        }, 0);
    }

    var PENDING = 'Pending',
        FULFILLED = 'Fulfilled',
        REJECTED = 'Rejected';

    var TYPE_THEN = 1;
    var TYPE_CATCH = 2;
    var TYPE_FINALLY = 3;

    var Promise = function Promise(resolver) {
        var self = this;
        this._status = PENDING;
        this._value;
        this._reason;
        this._callbacks = [];
        this._timer = null;

        var resolve = function (value) {
            if (self._status === PENDING) {
                self._status = FULFILLED;
                self._value = value;

                handleCallback(self);
            }
        };

        var reject = function (reason) {
            if (self._status === PENDING) {
                self._status = REJECTED;
                self._reason = reason;

                handleCallback(self);
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
            var i = 0,
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

                            if (isThenable(ret)) {
                                // 如果返回的也是一个Promise
                                ret.then(function (value) {
                                    resolve(value);
                                }, function (reason) {
                                    reject(reason);
                                });
                            } else {
                                resolve(ret);
                            }
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        resolve(ret);
                    }
                }

                function errback(reason) {
                    try {
                        if (isFunction(onRejected)) {
                            reject(onRejected(reason));
                        } else {
                            reject(reason);
                        }
                    } catch (e) {
                        reject(e);
                    }
                }

                self._callbacks.push({
                    type: TYPE_THEN,
                    handler: callback
                });
                self._callbacks.push({
                    type: TYPE_CATCH,
                    handler: errback,
                    isCaughtError: isFunction(onRejected)
                });

                handleCallback(self);
            });
        },
        'catch': function (onRejected) {
            return this.then(null, onRejected);
        },
        'finally': function (onFinally) {
            function finallyback() {
                if (isFunction(onFinally)) {
                    onFinally();
                }
            }

            this._callbacks.push({
                type: TYPE_FINALLY,
                handler: finallyback,
            });

            handleCallback(this);

            return this;
        }
    };

    return Promise;
})));