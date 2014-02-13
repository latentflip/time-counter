!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.TimeCounter=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based 
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {
    
});

emitter.on('somenamespace*', function (eventName, payloads) {
    
});

Please note that callbacks triggered by wildcard registered events also get 
the event name as the first argument.
*/
module.exports = WildEmitter;

function WildEmitter() {
    this.callbacks = {};
}

// Listen on the given `event` with `fn`. Store a group name if present.
WildEmitter.prototype.on = function (event, groupName, fn) {
    var hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined, 
        func = hasGroup ? arguments[2] : arguments[1];
    func._groupName = group;
    (this.callbacks[event] = this.callbacks[event] || []).push(func);
    return this;
};

// Adds an `event` listener that will be invoked a single
// time then automatically removed.
WildEmitter.prototype.once = function (event, groupName, fn) {
    var self = this,
        hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined, 
        func = hasGroup ? arguments[2] : arguments[1];
    function on() {
        self.off(event, on);
        func.apply(this, arguments);
    }
    this.on(event, group, on);
    return this;
};

// Unbinds an entire group
WildEmitter.prototype.releaseGroup = function (groupName) {
    var item, i, len, handlers;
    for (item in this.callbacks) {
        handlers = this.callbacks[item];
        for (i = 0, len = handlers.length; i < len; i++) {
            if (handlers[i]._groupName === groupName) {
                //console.log('removing');
                // remove it and shorten the array we're looping through
                handlers.splice(i, 1);
                i--;
                len--;
            }
        }
    }
    return this;
};

// Remove the given callback for `event` or all
// registered callbacks.
WildEmitter.prototype.off = function (event, fn) {
    var callbacks = this.callbacks[event],
        i;
    
    if (!callbacks) return this;

    // remove all handlers
    if (arguments.length === 1) {
        delete this.callbacks[event];
        return this;
    }

    // remove specific handler
    i = callbacks.indexOf(fn);
    callbacks.splice(i, 1);
    return this;
};

// Emit `event` with the given args.
// also calls any `*` handlers
WildEmitter.prototype.emit = function (event) {
    var args = [].slice.call(arguments, 1),
        callbacks = this.callbacks[event],
        specialCallbacks = this.getWildcardCallbacks(event),
        i,
        len,
        item;

    if (callbacks) {
        for (i = 0, len = callbacks.length; i < len; ++i) {
            if (callbacks[i]) {
                callbacks[i].apply(this, args);
            } else {
                break;
            }
        }
    }

    if (specialCallbacks) {
        for (i = 0, len = specialCallbacks.length; i < len; ++i) {
            if (specialCallbacks[i]) {
                specialCallbacks[i].apply(this, [event].concat(args));
            } else {
                break;
            }
        }
    }

    return this;
};

// Helper for for finding special wildcard event handlers that match the event
WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
    var item,
        split,
        result = [];

    for (item in this.callbacks) {
        split = item.split('*');
        if (item === '*' || (split.length === 2 && eventName.slice(0, split[1].length) === split[1])) {
            result = result.concat(this.callbacks[item]);
        }
    }
    return result;
};

},{}],2:[function(_dereq_,module,exports){
var WildEmitter = _dereq_('wildemitter');


function Timer(opts) {
    WildEmitter.call(this);
    this.config = {
        direction: 'up',
        startValue: 0,
        targetValue: '',
        interval: 50,
        showHours: false
    };

    if (typeof opts === 'object') {
        for (var item in opts) {
            this.config[item] = opts[item];
        }
    }
}

Timer.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: Timer
    }
});

Timer.prototype.setStartTime = function () {
    var now = Date.now();
    var countdownRemaining;

    if (this.config.startValue) {
        this.timerStartTime = now - this._parseStartValue(this.config.startValue);
    } else {
        this.timerStartTime = now;
    }

    if (this.config.direction === 'down') {
        // adding 1 second here actually ensures that the first value is going to be what
        // was passed in as start time since we're using Math.floor, this makes sense.
        this.timerTargetTime = now + this._parseStartValue(this.config.startValue) + 999 - this.previouslyElapsedTime;
        this.timerStartTime = now;
    }
};

Timer.prototype.start = function () {
    this.previouslyElapsedTime = 0;
    this.setStartTime();
    if (this.stoppedTime) {
        this.stoppedTime = 0;
    }
    this.timerStopped = false;
    this._update();
    this.emit('start');
    return this;
};

Timer.prototype.stop = function () {
    this.timerStopped = true;
    this.stoppedTime = Date.now();
    this.emit('stop');
    return this;
};

Timer.prototype.pause = function () {
    this.timerStopped = true;
    this.stoppedTime = Date.now();
    this.previouslyElapsedTime += this.stoppedTime - this.timerStartTime;
    this.emit('stop');
    return this;
};

Timer.prototype.resume = function () {
    this.timerStopped = false;
    this.setStartTime();
    if (this.config.direction === 'down' && (this.timerTargetTime < this.timerStartTime)) {
        console.log('bailing');
        return this;
    }
    this._update();
    this.emit('resume');
    return this;
};

Timer.prototype.getTime = function () {
    return this.time;
};

Timer.prototype._update = function () {
    if (this.timerStopped) return;

    var self = this,
        direction = this.config.direction,
        diff = function () {
            var now = Date.now();
            if (direction === 'up') {
                return (now - self.timerStartTime) + self.previouslyElapsedTime;
            } else {
                return Math.abs(self.timerTargetTime - now);
            }
        }(),
        s = Math.floor(diff / 1000) % 60,
        min = Math.floor((diff / 1000) / 60) % 60,
        hr = Math.floor(((diff / 1000) / 60) / 60) % 60,
        hasHours = hr > 0,
        time = ((this.config.showHours || hasHours) ? hr + ':' : '') + [hasHours ? this._zeroPad(min) : min, this._zeroPad(s)].join(':');

    if (this.time !== time) {
        this.time = time;
        this.emit('change', this.time);

        if (this.config.direction === 'down' && diff < 1000) {
            this.emit('done');
            this.stop();
        } else if (this.config.direction === 'up' && this.time === this.config.targetValue) {
            this.emit('done');
            this.stop();
        }
    }

    setTimeout(this._update.bind(this), this.config.interval);
};

Timer.prototype._zeroPad = function (num) {
    return (('' + num).length === 1) ? '0' + num : num;
};

Timer.prototype._parseStartValue = function (value) {
    var split = ('' + value).split(':'),
        hours = 0,
        minutes = 0,
        seconds = 0;

    if (split.length === 3) {
        hours = parseInt(split[0], 10);
        minutes = parseInt(split[1], 10);
        seconds = parseInt(split[2], 10);
    } else if (split.length === 2) {
        minutes = parseInt(split[0], 10);
        seconds = parseInt(split[1], 10);
    } else if (split.length === 1) {
        seconds = parseInt(split[0], 10);
    }

    return (hours * 3600000) + (minutes * 60000) + (seconds * 1000)
};


module.exports = Timer;

},{"wildemitter":1}]},{},[2])
(2)
});