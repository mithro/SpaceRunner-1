/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, module, me*/
var gs = require('client/game-state'),
    ui = require('client/ui'),
    _ = require('underscore')._,
    sh = require('shared');

/**
 * Manages and reproduces actions on the screen
 * @type {*}
 * @param {*} battleScreen The battle screen.
 * @constructor
 */
module.exports = function(battleScreen) {
    'use strict';
    var script,
        nextChange,
        modelChanges = [],
        v = sh.v, //vector math
        actionPlayers;

    this.loadScript = function(s) {
        script = s;
        nextChange = 0;
        modelChanges = script.getSortedModelChanges();
    };

    actionPlayers = {
        'Move': {
            'start': function(action) {
                var unitVM, tilePx, toPx;
                unitVM = battleScreen.shipVM.getUnitVMByID(
                    action.unitID
                );
                if (!unitVM) {
                    //unit was not in this ship
                    return;
                }
                tilePx = v.mul(action.to, gs.TILE_SIZE);
                toPx = v.add(tilePx, {x: 8, y: 8});//center
                unitVM.tweenTo(toPx, action.duration);
            }
        },
        'Attack': {
            'start': function(action) {
                var receiverVM = battleScreen.shipVM.getUnitVMByID(
                    action.receiverID
                );
                if (!receiverVM) {
                    //unit was not in this ship
                    return;
                }
                battleScreen.shipVM
                    .getUnitVMByID(action.attackerID)
                    .playAttack(receiverVM.pos);
            },
            'hit': function(action) {
                var receiverVM = battleScreen.shipVM.getUnitVMByID(
                    action.receiverID
                );
                if (!receiverVM) {
                    //unit was not in this ship
                    return;
                }
                receiverVM.playDamage(action.damage);
            }
        },
        'DamageShip' : {
            'start': function(action) {
                var red, tween, ship;
                if (action.shipID !== gs.ship.id) {
                    return;
                }
                ship = gs.battle.getShipByID(action.shipID);
                red = new ui.RedColorEntity(action.tile.x, action.tile.y);
                me.game.add(red, ui.layers.colorOverlay);
                me.game.sort();
                tween = new me.Tween(red).to({alpha: 0}, 200)
                    .onComplete(function() {
                        me.game.remove(red);
                    });
                tween.start();
                parent.postMessage({
                    eventName: 'ship hp',
                    targetID: ship.id,
                    hp: ship.hp
                }, '*');
            }
        },
        'FireShipWeapon': {
            'start': function(action) {
                var unit;
                unit = gs.battle.getUnitByID(action.unitID);
                if (unit.ship !== gs.ship) {
                    return;
                }
                battleScreen.shipVM.getVM(
                    unit.ship.getItemByID(action.weaponID)
                ).playFire();

            },
            'hit': function(action) {
                var targetShip = gs.battle.getShipByID(action.targetID);
                if (targetShip !== gs.ship) {
                    return;
                }
                me.game.add(new ui.ShipDamageOverlay(), ui.layers.effects);
                me.game.sort();
                parent.postMessage({
                    eventName: 'ship hp',
                    targetID: targetShip.id,
                    hp: targetShip.hp
                }, '*');
            }

        }
    };

    function playModelChange(modelChange) {
        var action = modelChange.action,
            play,
            playerGroup = actionPlayers[action.type];
        if (playerGroup) {
            play = playerGroup[modelChange.label];
            if (play) {
                play(action);
            }
        }
    }

    this.update = function(elapsed) {
        //apply model changes to ship
        if (nextChange < modelChanges.length &&
                elapsed >= modelChanges[nextChange].time &&
                //same condition as in 40_create-script.js
                //(queue[0].time <= turnDuration)
                modelChanges[nextChange].time <= script.turnDuration) {
            modelChanges[nextChange].apply(gs.battle);
            playModelChange(modelChanges[nextChange]);
            _.invoke(battleScreen.shipVM.unitVMs, 'notifyModelChange');
            nextChange++;
        } else if (nextChange >= modelChanges.length) {
            gs.battle.endOfTurnReset();
            battleScreen.pause();
        }
    };

};



