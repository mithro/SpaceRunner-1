/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global me, _, g_resources, items, width, height, TILE_SIZE, HALF_TILE, sh,
ItemVM, gs, make*/

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
    getMouse: function() {
        'use strict';
        var tile = utils.toTileVector(utils.getMousePx(), TILE_SIZE);
        this.lastMouse = tile;
        return tile;
    },
    getMousePx: function() {
        'use strict';
        if (!me.game.currentLevel.initialized) {
            throw "There's no level to get the mouse";
        }
        var pxPos = sh.v.sub(me.input.mouse.pos, me.game.currentLevel.pos);
        this.lastMousePx = pxPos;
        return pxPos;
    },
    setCursor: function(cursor) {
        'use strict';
        if (cursor !== this.currentCursor) {
            document.getElementById('jsapp').style.cursor = cursor;
            this.currentCursor = cursor;
        }
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
        return null;
    },
    actionStr: function(action) {
        'use strict';
        return action.start + ' -> ' + action.end + ': ' +
            sh.v.str(action.from) + ' -> ' + sh.v.str(action.to);
    },
    isMine: function(unit) {
        'use strict';
        return gs.player.id === unit.ownerID;
    },
    /**
     * Adds or removes VMs from MelonJS engine
     * and from the vms array, so it matches the models array.
     * @param {Array} models
     * @param {Array} vms
     * @param {int} zIndex
     * @return {boolean}
     */
    updateVMs: function(models, vms, zIndex) {
        'use strict';
        var i, v, hasVM, aux, somethingChanged = false;
        for (i = 0; i < models.length; i++) {
            hasVM = false;
            for (v = i; v < vms.length; v++) {
                if (models[i] === vms[v].m) {
                    hasVM = true;
                    break;
                }
            }
            if (hasVM) {
                //put vm at item's index position
                if (v !== i) {
                    aux = vms[v];
                    vms[v] = vms[i];
                    vms[i] = aux;
                }
            } else {
                //new vm
                vms.splice(i, 0, make.vm(models[i]));
                me.game.add(vms[i], zIndex);
                somethingChanged = true;
            }
        }
        //remove extra vms
        for (v = models.length; v < vms.length; v++) {
            me.game.remove(vms[v], true);
            somethingChanged = true;
        }
        vms.splice(models.length, vms.length - models.length);
        return somethingChanged;
    }
};

/**
 * Last mouse tile got by utils.getMouse
 * @type {{x: number, y: number}}
 */
utils.lastMouse = {x: 0, y: 0};
/**
 * Last mouse pixel pos got by utils.getMousePx
 * @type {{x: number, y: number}}
 */
utils.lastMousePx = {x: 0, y: 0};

