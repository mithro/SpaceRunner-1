/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, exports, module*/
var sh = module.exports,
    Jsonable = require('./20_jsonable').Jsonable,
    _ = require('underscore')._,
    actions = require('./60_actions').actions,
    Ship = require('./50_ship').Ship,
    Player = require('./25_player').Player,
    OrderCollection = require('./70_orders').OrderCollection,
    utils = require('../12_utils').utils;

/**
 * A battle.
 */
sh.Battle = Jsonable.extendShared({
    ships: [],
    arbiter: {//actor that declares a winner
        type: 'Arbiter',
        getActions: function(turnTime, battle) {
            'use strict';
            if (battle.winner !== undefined) {
                return [];//winner already declared
            }
            var shipsByStatus = _.groupBy(battle.ships, function(ship) {
                return ship.hp <= 0 ? 'destroyed' : 'alive';
            }),
                unitsByPlayer;

            if (shipsByStatus.destroyed) {
                if (shipsByStatus.alive) {
                    return [new actions.DeclareWinner({
                        playerID: shipsByStatus.alive[0].owner.id
                    })];
                }
                //all ships destroyed... (draw?)
            }

            //Lose when player has no units left.
            unitsByPlayer = _.chain(battle.getUnits())
                .filter(function(u) {return u.isAlive(); })
                .groupBy('ownerID').value();

            if (_.size(unitsByPlayer) === 1) {
                return [new actions.DeclareWinner({
                    playerID: parseInt(_.keys(unitsByPlayer)[0], 10)
                })];
            }

            return [];
        }
    },
    init: function(json) {
        'use strict';
        this.setJson({
            type: 'Battle',
            properties: ['id', 'turnDuration', 'winner'],
            json: json
        });
        this.ships = _.map(json.ships, function(shipJson) {
            var ship = new Ship({json: shipJson});
            ship.battle = this;
            return ship;
        }, this);
        this.players = _.map(json.players, function(playerJson) {
            return new Player(playerJson);
        });
        this.pendingActions = [];
        this.orderCollection = new OrderCollection();
    },
    toJson: function() {
        'use strict';
        var json = this.parent();
        json.ships = utils.mapToJson(this.ships);
        json.players = utils.mapToJson(this.players);
        return json;
    },
    addShip: function(ship) {
        'use strict';
        ship.battle = this;
        ship.id = this.ships.length + 1;
        this.ships.push(ship);
    },
    getShipByID: function(id) {
        'use strict';
        return _.findWhere(this.ships, {id: id});
    },
    getPlayers: function() {
        'use strict';
        return _.pluck(this.ships, 'owner');
    },
    /**
     *@return Array Objects that have the .getActions method.
     */
    getActors: function() {
        'use strict';
        var actors = this.getUnits();
        actors = actors.concat(_.filter(this.getItems(), function(item) {
            return item.getActions !== undefined;
        }));
        actors.push(this.arbiter);
        return actors;
    },
    getUnits: function() {
        'use strict';
        return _.flatten(_.pluck(this.ships, 'units'));
    },
    getItems: function() {
        'use strict';
        return _.flatten(_.pluck(this.ships, 'built'));
    },
    getUnitByID: function(id) {
        'use strict';
        id = parseInt(id, 10);
        return _.findWhere(this.getUnits(), {id: id});
    },
    assignUnitID: function(unit) {
        'use strict';
        var units = this.getUnits();
        if (units.length === 0) {
            unit.id = 1;
            return;
        }
        unit.id = _.max(units, function(e) {
            return e.id;
        }).id + 1;
    },
    /**
     * Gets the orders from all the units as an sh.OrderCollection
     * @return {sh.OrderCollection}
     */
    extractOrders: function() {
        'use strict';
        return this.orderCollection;
    },
    /**
     * Distribute the orders among the units.
     * @param {sh.OrderCollection} orderCollection
     */
    insertOrders: function(orderCollection) {
        'use strict';
        var self = this;
        _.each(orderCollection.allUnitOrders, function(unitOrders) {
            self.addUnitOrders(unitOrders);
        });
    },
    addUnitOrders: function(unitOrders) {
        'use strict';
        this.orderCollection.addUnitOrders(unitOrders);
        this.getUnitByID(unitOrders.unitID).orders = unitOrders.array;
    },
    endOfTurnReset: function() {
        'use strict';
        _.invoke(this.ships, 'endOfTurnReset', this.turnDuration);
        //remove orders from dead units
        _.each(this.orderCollection.allUnitOrders, function(unitOrders) {
            if (!this.getUnitByID(unitOrders.unitID)) {
                delete this.orderCollection.allUnitOrders[unitOrders.unitID];
            }
        }, this);
    },
    getPlayerShips: function(playerID) {
        'use strict';
        return _.filter(this.ships, function(ship) {
            return ship.owner.id === playerID;
        });
    },
    getEnemyShips: function(playerID) {
        'use strict';
        return _.filter(this.ships, function(ship) {
            return ship.owner.id !== playerID;
        });
    }
});