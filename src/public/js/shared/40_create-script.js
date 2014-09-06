/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, module, exports*/

var sh = require('./25_classes/80_script'), _ = sh._;
if (typeof exports !== 'undefined') {
    /**
     * NodeJS exports
     * @type {*}
     */
    sh = module.exports = sh;
}

(function() {
    'use strict';

    function insertByTime(array, item) {
        var insertionIndex = _.sortedIndex(array, item, 'time');
        array.splice(insertionIndex, 0, item);
    }

    function getVoidModelChange(time) {
        return new sh.ModelChange(0, function() {
        }, {time: time});
    }

    /**
     * Generates a "script" for the units given all the orders issued.
     * @param {Array} orders
     * @param {sh.Battle} battle
     * @param {Boolean} resetBattle Should the battle be cleaned up at the end.
     * @return {sh.Script}
     */
    function createScript(orders, battle, resetBattle) {
        var script, queue, changes, time, actors, actor, actions, i,
            registerActionReturned = {}, turnDuration = battle.turnDuration;
        script = new sh.Script({turnDuration: turnDuration});
        queue = [];
        function insertInQueue(item) {
            insertByTime(queue, item);
        }

        function registerAction(returned, time) {
            return function(action) {
                action.time = time;
                action.updateModelChanges();
                script.actions.push(action);
                _.each(action.modelChanges, function(mc, index) {
                    if (mc.time >= 0) {
                    //Add actionIndex and index used by script.registerChange
                        mc.actionIndex = script.actions.length - 1;
                        mc.index = index;
                        if (mc.time === action.time) {
                            //apply immediate changes
                            mc.apply(battle);
                            script.registerChange(mc);
                            returned.thereWereImmediateChanges = true;
                        } else {
                            insertInQueue(mc);
                        }
                    }
                });
            };
        }

        //set the orders to the units
        battle.insertOrders(orders);

        //null change to kick-start the process
        queue.push(getVoidModelChange(0));

        _.each(battle.pendingActions, function(action) {
            registerAction({}, action.time - turnDuration)(action);
        });

        //simulation loop (the battle gets modified and actions get added
        // to the script over time)
        while (queue.length > 0 && queue[0].time <= turnDuration) {
            time = queue[0].time;
            changes = _.where(queue, {time: time});
            _.invoke(changes, 'apply', battle);
            _.each(changes, script.registerChange, script);
            queue = queue.slice(changes.length);

            if (time < turnDuration) {
                //actions can't start at end of turn
                registerActionReturned.thereWereImmediateChanges = false;
                actors = battle.getActors();
                for (i = 0; i < actors.length; i++) {
                    actor = actors[i];
                    _.each(actor.getActions(time, battle),
                        registerAction(registerActionReturned, time));
                }
                if (registerActionReturned.thereWereImmediateChanges) {
                    insertInQueue(getVoidModelChange(time));
                }
            }
        }

        battle.pendingActions = _.chain(queue)
            .pluck('action')
            .uniq()
            .value();
        script.pendingActionsJson = sh.utils.mapToJson(battle.pendingActions);

        //clean up
        if (resetBattle) {
            battle.endOfTurnReset();
        }
        return script;
    }

    //export
    sh.createScript = createScript;
}());
