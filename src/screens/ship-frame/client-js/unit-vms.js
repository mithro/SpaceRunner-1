/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, exports, me*/

var TileEntityVM = require('client/tile-entity-vm'),
    draw = require('client/draw'),
    utils = require('client/utils'),
    sh = require('shared'),
    _ = require('underscore')._,
    gs = require('client/game-state'),
    ui = require('client/ui'),
    orderVMs = require('./order-vms');

var UnitVM = TileEntityVM.extend({
    speed: 1, //tiles per second
    size: [1, 1],
    cannonTile: [-0.25, -0.25],//image offset
    init: function(unitModel) {
        'use strict';
        this.m = unitModel;
        this.screen = me.state.current();
        this.size = unitModel.size;
        this.speed = unitModel.speed;
        this.selectionColor = utils.isMine(this.m) ? 'teal' : 'red';
        this.parent(unitModel.x, unitModel.y, {
            name: 'unit',
            image: 'creatures_16x16',
            spritewidth: 16,
            spriteheight: 16
        });
        function toImgRow(array) {
            var i;
            for (i = 0; i < array.length; i++) {
                array[i] += unitModel.imgIndex * 4;
            }
            return array;
        }
        this.addAnimation('idle', toImgRow([0, 0, 0, 1, 0, 0, 0, 0]));
        this.addAnimation('walking', toImgRow([0, 1, 2, 1]));
        this.addAnimation('dead', toImgRow([3]));

        this.setCurrentAnimation('idle');
        this.setTransparency('000000');
        this.center = {x: 8, y: 8};
        this.adjustSize(-8, gs.TILE_SIZE, -8, gs.TILE_SIZE);
        this.pos.x = (this.m.x * gs.TILE_SIZE) + gs.HALF_TILE;
        this.pos.y = (this.m.y * gs.TILE_SIZE) + gs.HALF_TILE;
        this.updateHealthBar();
        this.orderVMs = [];
        this.isSelectable = this.isMine();
        this.setTracked(['x', 'y', 'hp', 'moving', 'inCombat', 'dizzy',
            'chargingShipWeapon']);
    },
    updateHealthBar: function() {
        'use strict';
        this.healthBarSize = (16 * this.m.hp) / this.m.maxHP;
    },
    update: function() {
        'use strict';
        this.parent();
        if (this.pos.x !== this.prevX) {
            if (this.pos.x - this.prevX > 0) {
                this.faceLeft(false);
            } else {
                this.faceLeft(true);
            }
        }
        this.prevX = this.pos.x;
        if (!this.screen.paused) {
            this.updateOrderVMs();
        }
        return true;
    },
    updateOrderVMs: function() {
        'use strict';
        var vmsChanged = utils.updateVMs({
            models: _.filter(this.m.orders, function(o) {
                return o instanceof sh.orders.GoTo;
            }),
            vms: this.orderVMs,
            zIndex: ui.layers.indicators,
            DefaultConstructor: orderVMs.Move,
            vmConstructors: orderVMs
        });
        if (vmsChanged) {
            _.invoke(this.orderVMs, 'updatePath');
            me.game.sort();
            return true;
        }
        return false;
    },
    onModelChanged: function(changed) {
        'use strict';
        if (changed.hp) {
            this.updateHealthBar();
            if (!this.m.isAlive()) {
                this.setCurrentAnimation('dead');
                this.alpha = 0.4;
                if (this.posTween) {
                    this.posTween.stop();
                }
                if (this.chargingWeaponIcon) {
                    me.game.remove(this.chargingWeaponIcon, true);
                }
                return;
            }
        }
        if (changed.inCombat && !this.m.inCombat) {
            this.centerInTile();
        }
        if (changed.chargingShipWeapon) {
            if (this.m.chargingShipWeapon) {
                this.chargingShipWeapon = {
                    weapon: this.m.ship
                        .getItemByID(this.m.chargingShipWeapon.weaponID),
                    icon: new ui.ChargingWeaponIcon(this)
                };
                me.game.add(this.chargingShipWeapon.icon, ui.layers.indicators);
                me.game.sort();
            } else {
                if (this.chargingShipWeapon) {
                    me.game.remove(this.chargingShipWeapon.icon, true);
                    this.chargingShipWeapon = null;
                }
            }
        }
        if (changed.x || changed.y) {
            if (this.orderVMs.length > 0) {
                this.orderVMs[0].updatePath();
            }
        }
    },
    onShip: function() {
        'use strict';
        return this.m.ship;
    },
    drawHealthBar: function(ctx) {
        'use strict';
        var color = 'green',
            relPosition = {x: -8, y: 10},
            absPosition = sh.v.add(this.pos, relPosition);
        if (this.healthBarSize <= 10) {
            color = 'orange';
        }
        if (this.healthBarSize <= 6) {
            color = 'red';
        }
        ctx.save();
        draw.line(ctx, absPosition,
            {x: absPosition.x + this.healthBarSize, y: absPosition.y},
            color, 3);
        ctx.restore();
    },
    draw: function(ctx) {
        'use strict';
        var originalPos = this.pos.clone();

        this.pos.sub(this.center);
        this.parent(ctx);
        this.pos.x = originalPos.x;
        this.pos.y = originalPos.y;
        if (this.m.isAlive()) {
            this.drawHealthBar(ctx);
        }
        if (this.chargingShipWeapon && this.m.chargingShipWeapon) {
            this.drawWeaponChargeProgressBar(ctx);
        }
    },
    drawWeaponChargeProgressBar: function(ctx) {
        'use strict';
        var weapon = this.chargingShipWeapon.weapon,
            pos = sh.v.mul(weapon, gs.TILE_SIZE),
            elapsed = this.screen.elapsed -
                this.m.chargingShipWeapon.startingTime,
            width = (40 * elapsed) / weapon.chargeTime;
        pos.x += 12;
        pos.y += 13;
        ctx.save();
        draw.line(ctx, pos, {x: pos.x + width, y: pos.y}, '#2326D9', 10);
        ctx.restore();
    },
    isMine: function() {
        'use strict';
        return utils.isMine(this.m);
    },
    /**
     * Sets if the unit should face left.
     * @param {Boolean} faceLeft
     */
    faceLeft: function(faceLeft) {
        'use strict';
        if (this.m.imageFacesRight) {
            faceLeft = !faceLeft;
        }
        this.flipX(!faceLeft);
    },
    tweenTo: function(pixelPos, duration, easing) {
        'use strict';
        if (this.posTween) {
            this.posTween.stop();
        }
        this.posTween = new me.Tween(this.pos)
                .to({x: pixelPos.x, y: pixelPos.y}, duration);
        if (easing) {
            this.posTween.easing(easing);
        }
        this.posTween.start();
    },
    centerInTile: function() {
        'use strict';
        this.tweenTo({
            x: (this.m.x * gs.TILE_SIZE) + gs.HALF_TILE,
            y: (this.m.y * gs.TILE_SIZE) + gs.HALF_TILE
        }, 700, me.Tween.Easing.Sinusoidal.EaseOut);
    },
    playAttack: function() {
        'use strict';
        return null;//for jsLint
    },
    /**
     * Shows a hit on the unit and the amount dealt as a floating number
     * above the unit.
     * @param {int} amount
     */
    playDamage: function(amount) {
        'use strict';
        me.game.add(new ui.StarHit(this), ui.layers.effects);
        me.game.add(new ui.FloatingNumber(this.pos, -amount),
            ui.layers.effects);
        me.game.sort();
    },
    onMouseUp: function() {
        'use strict';
        if (this.screen.dragging) {
            return;
        }
        if (this.isSelectable) {
            //deselect all the units first
            _.chain(gs.selected)
                .where({name: 'unit'})
                .invoke('deselect');
        }
        this.parent();
    },
    onSelected: function() {
        'use strict';
        console.log('Selected unit ' + this.m.id + ' - pos: ' +
            sh.v.str(this.m) + ', GUID: ' + this.GUID);
        parent.postMessage({eventName: 'unit selected', unitID: this.m.id},
            '*');
        _.invoke(this.orderVMs, 'show');
    },
    onDeselected: function() {
        'use strict';
        _.invoke(this.orderVMs, 'hide');
    },
    occupies: function(tile) {
        'use strict';
        var x = tile.x, y = tile.y;
        return x >= this.m.x && x < this.m.x + this.trueSize(0) &&
            y >= this.m.y && y < this.m.y + this.trueSize(1);
    },
    onDestroyEvent: function() {
        'use strict';
        this.parent();
        _.each(this.orderVMs, function(o) {
            me.game.remove(o, true);
        });
    }
});

var unitVMs = {};

/**
 * ViewModel for sh.units.Zealot unit
 * @type {void|*|Class|extend|extend|extend}
 */
unitVMs.ZealotVM = UnitVM.extend({
    /**
     * Shoot a projectile at target
     * @param {{x:{int}, y:{int}}} targetPos
     */
    playAttack: function(targetPos) {
        'use strict';
        var bullet, tween;
        bullet = new me.ObjectEntity(this.pos.x, this.pos.y, {
            image: 'projectile'
        });
        me.game.add(bullet, ui.layers.effects);
        tween = new me.Tween(bullet.pos).to(targetPos, 300)
            .onComplete(function() {
                me.game.remove(bullet, true);
            });
        tween.start();
    }
});

exports.UnitVM = UnitVM;
exports.unitVMs = unitVMs;
