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
        _.each(orders, function(unitOrders, unitID) {
            self.playersOrders[playerID][unitID] = unitOrders;
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
}

/**
 * A model representing a battle.
 * @param {{id,ship}} parameters
 * @constructor
 */
exports.Battle = Class.extend({
    //The players currently in this battle
    playerLeft: null,
    playerRight: null,
    numberOfPlayers: 2,
    turnCount: 0,
    currentTurn: null,

    receivedTheScript: [], //players ids that received the script
    turnDuration: 4000,
    winner: null,
    init: function(parameters) {
        'use strict';
        this.id = parameters.id;
        this.ship = parameters.ship;
    },
    /**
     * Informs that some player has received the script.
     * When all players in the battle receive the script,
     * a new turn is created.
     * @param {int} playerID The player ID.
     * @return {boolean} If the next turn was created or not.
     * @this exports.Battle
     */
    registerScriptReceived: function(playerID) {
        'use strict';
        this.receivedTheScript.push(playerID);
        if (_.uniq(this.receivedTheScript).length >= this.numberOfPlayers) {
            //all players have received the script, create next turn
            this.nextTurn();
            return true;
        }
        return false;
    },
    nextTurn: function() {
        'use strict';
        this.turnCount++;
        this.currentTurn = new BattleTurn({id: this.turnCount, battle: this});
        this.receivedTheScript = [];

    },
    isPlayerInIt: function(playerID) {
        'use strict';
        return (this.playerLeft && this.playerLeft.id === playerID) ||
            (this.playerRight && this.playerRight.id === playerID);
    },
    generateScript: function(resetShip) {
        'use strict';
        var turn = this.currentTurn,
            orders = _.extend(turn.playersOrders[this.playerLeft.id],
                turn.playersOrders[this.playerRight.id]);
        if (resetShip === undefined) {
            resetShip = true;
        }
        console.log('all orders' + JSON.stringify(orders));
        turn.script = sh.createScript(orders, this.ship, this.turnDuration,
            resetShip);
    },
    toJson: function() {
        'use strict';
        return {
            id: this.id,
            ship: this.ship.toJson(),
            playerLeft: this.playerLeft.toJson(),
            playerRight: this.playerRight.toJson(),
            turnDuration: this.turnDuration
        };
    }
});

/**
 * A battle for the "Challenge" menu option.
 * @type {*}
 */
exports.ChallengeBatte = exports.Battle.extend({
    init: function(params) {
        'use strict';
        var ship = new sh.Ship({json: params.shipJson}),
            Zealot = sh.units.Zealot;
        ship.putUnit(new Zealot({ownerID: params.player.id}));
        ship.putUnit(new Zealot({ownerID: params.player.id}));
        ship.putUnit(new Zealot({ownerID: params.player.id}));
        ship.putUnit(new Zealot({ownerID: params.player.id}));
        ship.putUnit(new Zealot({ownerID: params.player.id}));
        this.parent({id: params.id, ship: ship});
        this.playerLeft = params.player;
        this.playerRight = new exports.AIPlayer('Enemy');
    },
    nextTurn: function() {
        'use strict';
        this.parent();
        //register AI player orders
        this.currentTurn.addOrders(this.playerRight.getOrders(this),
            this.playerRight.id);
        this.currentTurn.setPlayerReady(this.playerRight.id);
        this.registerScriptReceived(this.playerRight.id);
    },
    generateScript: function() {
        'use strict';
        var i, clearTiles = [], summonPosition, script,
            ship = this.ship,
            newActions = [];
        this.parent(false);
        script = this.currentTurn.script;
        //every 3 turns...
        if ((this.turnCount - 1) % 3 === 0) {
            //...add units for AI player
            ship.map.tiles(function(x, y) {
                if (ship.map.at(x, y) === sh.tiles.clear ||
                        ship.map.at(x, y) instanceof sh.Unit) {
                    clearTiles.push({x: x, y: y});
                }
            });
            //get random floor tile
            summonPosition = clearTiles[_.random(clearTiles.length - 1)];
            for (i = 0; i < 3; i++) {
                //noinspection JSValidateTypes
                newActions.push(new sh.actions.Summon({
                    time: script.turnDuration - 1,
                    x: summonPosition.x,
                    y: summonPosition.y,
                    playerID: this.playerRight.id,
                    unitType: i === 2 ? 'MetalSpider' : 'Critter'
                }));
            }
        }
        if (ship.hp <= 0) {
            //ship is destroyed
            newActions.push(new sh.actions.DeclareWinner({
                time: script.turnDuration - 1,
                playerID: this.playerRight.id
            }));
        } else if (ship.enemyHP <= 0) {
            //enemy is destroyed!
            newActions.push(new sh.actions.DeclareWinner({
                time: script.turnDuration - 1,
                playerID: this.playerLeft.id
            }));
        }

        //workaround until summon gets converted to teleport
        _.each(newActions, script.insertAction, script);
        _.each(newActions, function(a) {
            var actionIndex = _.indexOf(script.actions, a);
            _.each(a.modelChanges, function(mc, index) {
                mc.apply(ship);
                mc.actionIndex = actionIndex;
                mc.index = index;
                script.registerChange(mc);
            });
        });

        ship.endOfTurnReset(this.turnDuration);
    }
});


/**
 * A model representing the battle set up (for the battle-set-up screen)
 * @param {{id, creator, shipJson}} params
 * @constructor
 */
exports.BattleSetUp = function(params) {
    'use strict';
    this.id = params.id;
    this.creator = params.creator;
    this.shipJson = params.shipJson;
    this.challenger = null; //player that joins
    this.battle = null;
    this.toJson = function() {
        return {
            id: this.id,
            battle: this.battle ?
                new sh.Battle({
                    id: this.battle.id,
                    turnDuration: this.battle.turnDuration,
                    ships: [this.battle.ship.toJson()],
                    players: [this.battle.playerLeft.toJson(),
                        this.battle.playerRight.toJson()]
                }).toJson() : null,
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
            ship = new sh.Ship({json: this.shipJson});
            battle = new exports.Battle({id: battles.length, ship: ship});
            ship.putUnit({imgIndex: 6, speed: 2, ownerID: this.creator.id});
            ship.putUnit({imgIndex: 6, speed: 2, ownerID: this.creator.id});
            ship.putUnit({imgIndex: 0, speed: 1.5, ownerID: this.creator.id});
            ship.putUnit({imgIndex: 0, speed: 1.5, ownerID: this.creator.id});

            ship.putUnit({imgIndex: 7, speed: 1.5,
                ownerID: this.challenger.id});
            ship.putUnit({imgIndex: 7, speed: 1.5,
                ownerID: this.challenger.id});
            ship.putUnit({imgIndex: 12, speed: 2, ownerID: this.challenger.id});
            ship.putUnit({imgIndex: 12, speed: 2, ownerID: this.challenger.id});
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
    function getWeakSpotsTiles(ship) {
        var weakSpots = _.filter(ship.built, function(i) {
                return i instanceof sh.items.WeakSpot;
            }),
            tiles = [];
        _.each(weakSpots, function(ws) {
            ws.tiles(function(x, y) {
                tiles.push({x: x, y: y});
            });
        });
        return tiles;
    }

    function makeUnitsUnwalkable(ship, grid) {
        var units = ship.units;
        _.each(units, function(u) {
            if (u.x >= 0 && u.x < grid.width &&
                    u.y >= 0 && u.y < grid.height) {
                grid.setWalkableAt(u.x, u.y, false);
            }
        });
        return grid;
    }

    function getPaths(grid, from, destinations) {
        var paths = [];
        _.each(destinations, function(d) {
            var path = pfFinder.findPath(from.x, from.y, d.x, d.y,
                grid.clone());
            if (path.length > 1) {
                paths.push(path);
            }
        });
        return paths;
    }

    function getShortest(arrays) {
        return _.min(arrays, function(a) {
            return a.length;
        });
    }

    function pathDestination(path) {
        var dest = _.last(path);
        return {x: dest[0], y: dest[1]};
    }

    function setOrderForShortestPath(grid, unit, destinations, orders) {
        var paths = getPaths(grid.clone(), unit, destinations);
        if (paths.length > 0) {
            orders[unit.id] = [new sh.orders.Move({
                unitID: unit.id,
                destination: pathDestination(getShortest(paths))
            })];
            return true;
        }
        return false;
    }

    function setSeekAndDestroyOrderForShortestPath(grid, unit, targets,
                                                   orders) {
        var paths = getPaths(grid.clone(), unit, targets);
        if (paths.length > 0) {
            orders[unit.id] = [new sh.orders.SeekAndDestroy({
                unitID: unit.id,
                targetID: _.find(targets, function(t) {
                    return sh.v.equal(pathDestination(getShortest(paths)), t);
                }).id
            })];
            return true;
        }
        return false;
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
                grid = new sh.PF.Grid(ship.width, ship.height,
                    ship.getPfMatrix()),
                gridWithUnits = makeUnitsUnwalkable(ship, grid.clone()),
                myUnits = _.groupBy(ship.getPlayerUnits(this.id), 'type'),
                enemyUnits = _.filter(ship.units, function(u) {
                    return u.ownerID !== this.id;
                }, this),
                orders = {},
                tiles = getWeakSpotsTiles(ship),
                free = [],
                occupied = [];
            _.each(tiles, function(t) {
                if (_.any(myUnits, function(unit) {
                        return unit.x === t.x && unit.y === t.y;
                    })) {
                    occupied.push(t);
                } else {
                    free.push(t);
                }
            });
            _.each(myUnits.Critter, function(unit) {
                if (ship.itemsMap.at(unit.x, unit.y) instanceof
                        sh.items.WeakSpot) {
                    //already at the spot, don't move
                    return;
                }
                //optimal: to free tile avoiding units
                if (setOrderForShortestPath(gridWithUnits.clone(), unit,
                        free, orders)) {
                    return;
                }
                //2nd optimal: to free tile through units
                if (setOrderForShortestPath(grid.clone(), unit,
                        free, orders)) {
                    return;
                }
                //3rd optimal: to occupied tile avoiding units
                if (setOrderForShortestPath(gridWithUnits.clone(), unit,
                        occupied, orders)) {
                    return;
                }
                //4th optimal: to occupied tile through units
                setOrderForShortestPath(grid.clone(), unit,
                        occupied, orders);
            });
            _.each(myUnits.MetalSpider, function(unit) {
                setSeekAndDestroyOrderForShortestPath(grid.clone(), unit,
                    enemyUnits, orders);
            });
            return orders;
        }
    });
    exports.AIPlayer = AIPlayer;
}(exports));
