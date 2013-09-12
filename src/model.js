/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, exports, battles*/

var Class = require('./class'),
    sh = require('./public/js/shared'),
    auth = require('./auth'),
    _ = require('underscore')._;


function BattleTurn(params) {
    'use strict';
    this.id = params.id;
    this.battle = params.battle;
    this.playersOrders = {};
    this.playersOrders[this.battle.playerLeft.id] = {};
    this.playersOrders[this.battle.playerRight.id] = {};
    //all the players ids that have submitted the orders
    this.playersSubmitted = [];
    this.script = null;
    this.addOrders = function(orders, playerID) {
        var self = this;
        if (!this.battle.isPlayerInIt(playerID)) {
            throw 'Player ' + playerID + ' is not in the battle.';
        }
        _.each(orders, function(order) {
            self.playersOrders[playerID][order.unitID] = order;
        });
    };
    this.isPlayerReady = function(playerID) {
        return _.any(this.playersSubmitted, function(id) {
            return id === playerID;
        });
    };
    this.setPlayerReady = function(playerID) {
        this.playersSubmitted.push(playerID);
    };
    this.generateScript = function() {
        var orders = _.extend(this.playersOrders[this.battle.playerLeft.id],
                              this.playersOrders[this.battle.playerRight.id]);

        console.log('all orders' + JSON.stringify(orders));
        this.script = sh.createScript(orders, this.battle.ship,
            this.battle.turnDuration);
    };
}

/**
 * A model representing a battle.
 * @param {{id,ship}} parameters
 * @constructor
 */
exports.Battle = function(parameters) {
    'use strict';
    this.id = parameters.id;
    this.ship = parameters.ship;
    //The players currently in this battle
    this.playerLeft = null;
    this.playerRight = null;
    this.numberOfPlayers = 2;
    this.turnCount = 0;
    this.currentTurn = null;

    this.receivedTheScript = []; //players ids that received the script
    this.turnDuration = 3000;
    /**
     * Informs that some player has received the script.
     * When all players in the battle receive the script,
     * a new turn is created.
     * @param {int} playerID The player ID.
     * @return {boolean} If the next turn was created or not.
     * @this exports.Battle
     */
    this.registerScriptReceived = function(playerID) {
        this.receivedTheScript.push(playerID);
        if (_.uniq(this.receivedTheScript).length >= this.numberOfPlayers) {
            //all players have received the script, create next turn
            this.nextTurn();
            return true;
        }
        return false;
    };
    this.nextTurn = function() {
        this.turnCount++;
        this.currentTurn = new BattleTurn({id: this.turnCount, battle: this});
        this.receivedTheScript = [];

        //register AI player orders
        if (this.playerRight instanceof exports.AIPlayer) {
            this.currentTurn.addOrders(this.playerRight.getOrders(this),
                this.playerRight.id);
            this.currentTurn.setPlayerReady(this.playerRight.id);
            this.registerScriptReceived(this.playerRight.id);
        }
    };
    this.isPlayerInIt = function(playerID) {
        return (this.playerLeft && this.playerLeft.id === playerID) ||
            (this.playerRight && this.playerRight.id === playerID);
    };
    this.toJson = function() {
        return {
            id: this.id,
            ship: this.ship.toJsonString(),
            playerLeft: this.playerLeft.toJson(),
            playerRight: this.playerRight.toJson()
        };
    };
};

/**
 * A model representing the battle set up (for the battle-set-up screen)
 * @param {{id, creator, shipJsonString}} params
 * @constructor
 */
exports.BattleSetUp = function(params) {
    'use strict';
    this.id = params.id;
    this.creator = params.creator;
    this.shipJsonString = params.shipJsonString;
    this.challenger = null; //player that joins
    this.battle = null;
    this.toJson = function() {
        return {
            id: this.id,
            battle: this.battle ?
                    this.battle.toJson() : null,
            creator: this.creator ?
                    this.creator.toJson() : {name: '<empty>'},
            challenger: this.challenger ?
                    this.challenger.toJson() : {name: '<empty>'}
        };
    };
    this.isFull = function() {
        return this.challenger && this.creator;
    };
    this.addPlayer = function(player) {
        if (!this.isFull()) {
            this.challenger = player;
        } else {
            throw 'Cannot add player, battle is full';
        }
    };
    this.updatePlayers = function() {
        if (this.creator && !auth.isOnline(this.creator.id)) {
            this.creator = null;
        }
        if (this.challenger && !auth.isOnline(this.challenger.id)) {
            this.challenger = null;
        }
    };
    /**
     * Returns the battle.
     * @param {Function} done callback for when it creates the battle.
     * @this exports.BattleSetUp
     */
    this.createBattle = function(done) {
        var err = null,
            ship,
            battle;
        try {
            ship = new sh.Ship({jsonString: this.shipJsonString});
            battle = new exports.Battle({id: battles.length, ship: ship});
            ship.putUnit({type: 6, speed: 2, owner: this.creator});
            ship.putUnit({type: 6, speed: 2, owner: this.creator});
            ship.putUnit({type: 0, speed: 1.5, owner: this.creator});
            ship.putUnit({type: 0, speed: 1.5, owner: this.creator});

            ship.putUnit({type: 7, speed: 1.5, owner: this.challenger});
            ship.putUnit({type: 7, speed: 1.5, owner: this.challenger});
            ship.putUnit({type: 12, speed: 2, owner: this.challenger});
            ship.putUnit({type: 12, speed: 2, owner: this.challenger});
            battle.playerLeft = this.creator;
            battle.playerRight = this.challenger;
            battles.push(battle);
            battle.nextTurn();
            this.battle = battle;
        } catch (e) {
            err = new Error(e);
        }
        done(err);
    };
};

//AI player stuff
(function(exports) {
    'use strict';
    var pfFinder = new sh.PF.AStarFinder({
        allowDiagonal: true
    }),
        AIPlayer;
    function getNearestWeakSpot(ship, pos) {
        var grid = new sh.PF.Grid(ship.width, ship.height, ship.getPfMatrix()),
            weakSpots = _.filter(ship.built, function(i) {
                return i instanceof sh.items.WeakSpot;
            });
        return _.min(weakSpots, function(ws) {
            return pfFinder.findPath(pos.x, pos.y, ws.x, ws.y,
                grid.clone()).length;
        });
    }

    function getUnoccupiedTile(weakSpot, units) {
        var tile;
        weakSpot.tiles(function(x, y) {
            if (!_.any(units, function(unit) {
                    return unit.x === x && unit.y === y;
                })) {
                tile = {x: x, y: y};
            }
        });
        return tile;
    }

    /**
     * An AI controlled player.
     * @type {*}
     */
    AIPlayer = sh.Player.extendShared({
        init: function(name) {
            this.id = -1;
            this.name = name;
        },
        /**
         * Gets the orders that the player would give for the current turn.
         * @param {exports.Battle} battle The battle.
         */
        getOrders: function(battle) {
            var ship = battle.ship,
                units = ship.getPlayerUnits(this.id),
                orders = {};
            _.each(units, function(unit) {
                var ws = getNearestWeakSpot(ship, unit),
                    destination = getUnoccupiedTile(ws, units);
                if (!destination) {
                    destination = ws;
                }
                orders[unit.id] = sh.make.moveOrder(unit, destination);
            });
            return orders;
        }
    });
    exports.AIPlayer = AIPlayer;
}(exports));
