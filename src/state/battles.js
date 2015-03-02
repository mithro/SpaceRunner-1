/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, exports*/
var sh = require('shared'),
    BattleServer = require('../classes/battle-server'),
    prebuiltShips = require('./prebuilt-ships'),
    players = require('./players'),
    _ = require('underscore')._,
    join = require('bluebird').join;

var playersWaitingByTier = {},
    battleServers = [];

function createBattle(players) {
    'use strict';
    var ship1,
        ship2,
        p1 = players[0],
        p2 = players[1],
        battleServer,
        U = sh.Unit;
    return join(prebuiltShips.get(p1.hullID),
        prebuiltShips.get(p2.hullID))
        .then(function(ships) {
            var shipJsons = _.map(ships, function(s) {
                    return JSON.parse(s.shipJson);
                });
            battleServer = new BattleServer({
                id: battleServers.length,
                shipJsons: shipJsons
            });
            return join(
                p1.set('battleID', battleServer.id),
                p2.set('battleID', battleServer.id),
                p1.set('state', 'inBattle'),
                p2.set('state', 'inBattle')
            );
        }).then(function() {
            ship1 = battleServer.battleModel.ships[0];
            ship1.owner = p1;
            ship1.putUnit(new U({imgIndex: 6, speed: 2}));
            ship1.putUnit(new U({imgIndex: 6, speed: 2}));
            ship1.putUnit(new U({imgIndex: 0, speed: 1.5}));
            ship1.putUnit(new U({imgIndex: 0, speed: 1.5}));

            ship2 = battleServer.battleModel.ships[1];
            ship2.owner = p2;
            ship2.putUnit(new U({imgIndex: 7, speed: 1.5}));
            ship2.putUnit(new U({imgIndex: 7, speed: 1.5}));
            ship2.putUnit(new U({imgIndex: 12, speed: 2}));
            ship2.putUnit(new U({imgIndex: 12, speed: 2}));

            battleServers.push(battleServer);
            battleServer.nextTurn();
        });
}


function addPlayerToQueue(player) {
    'use strict';
    return join(
        prebuiltShips.getTier(player.hullID),
        player.set('state', 'finding')
    ).then(function(stuff) {
        var waiting,
            tier = stuff[0];
        if (!playersWaitingByTier[tier]) {
            playersWaitingByTier[tier] = [];
        }
        waiting = playersWaitingByTier[tier];
        waiting.push(player);
        if (waiting.length >= 2) {
            return createBattle(waiting.slice(0, 2)).then(function() {
                playersWaitingByTier[tier] = waiting.slice(2);
            });
        }
    });
}

function removeFromQueue(player) {
    'use strict';
    return player.set('state', 'idle').then(function() {
        _.each(playersWaitingByTier, function(players) {
            sh.utils.removeFromArray(player, players);
        });
    });
}

function get(id) {
    'use strict';
    id = parseInt(id, 10);
    return _.find(battleServers, function(bs) {
        return bs.id === id;
    });
}

exports.addPlayerToQueue = addPlayerToQueue;
exports.removeFromQueue = removeFromQueue;
exports.get = get;
