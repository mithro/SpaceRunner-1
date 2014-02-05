/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global me, _, g_resources, items, width, height, TILE_SIZE, HALF_TILE, sh,
ItemVM, gs*/

// Avoid `console` errors in browsers that lack a console.
if (!(window.console && console.log)) {
    (function() {
        'use strict';
        var noop, methods, length, console;
        noop = function() {};
        methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml',
            'error', 'exception', 'group', 'groupCollapsed', 'groupEnd',
            'info', 'log', 'markTimeline', 'profile', 'profileEnd',
            'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace',
            'warn'];
        length = methods.length;
        console = window.console = {};
        while (length--) {
            console[methods[length]] = noop;
        }
    }());
}

var utils = {
    getParameterByName: function(name) {
        'use strict';
        var match = new RegExp('[?&]' + name + '=([^&]*)')
            .exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    },
    toTileVector: function(vector2D, tileSize) {
        'use strict';
        var v = new me.Vector2d();
        v.x = Math.floor(vector2D.x / tileSize);
        v.y = Math.floor(vector2D.y / tileSize);
        return v;
    },
    //returns the tile position of the mouse
    getMouse: function(inPixels) {
        'use strict';
        if (!me.game.currentLevel.initialized) {
            throw "There's no level to get the mouse";
        }
        var relPosition = sh.v.sub(me.input.mouse.pos,
            me.game.currentLevel.pos);
        return inPixels ? relPosition :
                utils.toTileVector(relPosition, TILE_SIZE);
    },
    setCursor: function(cursor) {
        'use strict';
        document.getElementById('jsapp').style.cursor = cursor;
    },
    /**
     * Executes a callback when a certain number of
     * .done() were called on TaskWait, or an
     * error handler if .error() was called instead.
     * @param {Object} settings has 'pendingCount'(int), 'allDone', 'error'.
     * @constructor
     */
    TaskWait: function(settings) {
        'use strict';
        var tickCount = 0,
            errorThrown = false,
            pendingCount = settings.pendingCount,
            _allDoneCallback = settings.allDone,
            _errorCallback = settings.error;

        this.done = function() {
            if (errorThrown) {
                return;
            }
            tickCount++;
            if (tickCount === pendingCount) {
                _allDoneCallback();
            } else if (tickCount > pendingCount) {
                throw 'Number of ticks exceeded expected count ' +
                    '(pendingCount).';
            }
        };
        this.error = function() {
            errorThrown = true;
            _errorCallback();
        };
    },
    /**
     * Returns the model of the object if it's a viewmodel,
     * or returns the object itself if it's a model.
     * @param {*} object
     * @return {sh.Item}
     */
    getModel: function(object) {
        'use strict';
        if (object instanceof sh.Item) {
            return object;
        }
        if (object instanceof ItemVM) {
            return object.m;
        }
    },
    actionStr: function(action) {
        'use strict';
        return action.start + ' -> ' + action.end + ': ' +
            sh.v.str(action.from) + ' -> ' + sh.v.str(action.to);
    },
    isMine: function(unit) {
        'use strict';
        return gs.player.id === unit.ownerID;
    }
};

