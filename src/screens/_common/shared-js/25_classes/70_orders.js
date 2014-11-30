/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global require, exports, module*/
var sh = module.exports,
    _ = require('underscore')._,
    PF = require('pathfinding'),
    SharedClass = require('./10_shared-class').SharedClass,
    Jsonable = require('./20_jsonable').Jsonable,
    utils = require('../12_utils').utils,
    v = require('../10_general-stuff').v,
    actions = require('./60_actions').actions,
    items = require('./32_items').items;

(function() {
    'use strict';
    var pathfinder = new PF.AStarFinder({
            allowDiagonal: true,
            dontCrossCorners: true
        });

    sh.OrderCollection = SharedClass.extendShared({
        init: function(json) {
            this.allUnitOrders = {};
            if (json) {
                _.each(json, function(unitOrdersJson, unitID) {
                    this.allUnitOrders[unitID] =
                        new sh.UnitOrders(unitOrdersJson);
                }, this);
            }
        },
        /**
         * Adds a unit's orders to the collection.
         * @param {sh.UnitOrders} unitOrders
         */
        addUnitOrders: function(unitOrders) {
            this.allUnitOrders[unitOrders.unitID] = unitOrders;
        },
        getUnitOrders: function(unitID) {
            return this.allUnitOrders[unitID];
        },
        /**
         *
         * @param {sh.OrderCollection} orderCollection Another collection.
         */
        merge: function(orderCollection) {
            _.each(orderCollection.allUnitOrders, function(orders) {
                if (this.getUnitOrders(orders.unitID)) {
                    throw 'The collection already had orders for unit ' +
                        orders.unitID;
                }
                this.addUnitOrders(orders);
            }, this);
        },
        clone: function() {
            return new sh.OrderCollection(this.toJson());
        },
        toJson: function() {
            var json = {};
            _.each(this.allUnitOrders, function(unitOrders, unitID) {
                json[unitID] = unitOrders.toJson();
            });
            return json;
        }
    });

    sh.UnitOrders = SharedClass.extendShared({
        type: 'UnitOrders',
        init: function(json) {
            this.unitID = parseInt(json.unitID, 10);
            this.array = utils.mapFromJson(json.array, sh.orders);
            this.validate(this.unitID);
        },
        validate: function(unitID) {
            if (_.any(this.array, function(order) {
                    return order.unitID !== unitID;
                })) {
                throw 'There are orders that don\'t belong to the unit';
            }
        },
        add: function(order) {
            if (order.unitID !== this.unitID) {
                throw 'The order does not belong to the unit';
            }
            this.array.push(order);
        },
        toJson: function() {
            return {
                type: this.type,
                unitID: this.unitID,
                array: utils.mapToJson(this.array)
            };
        }
    });

    sh.Order = Jsonable.extendShared({
        init: function(json) {
            this.setJson({
                type: 'Order',
                properties: ['unitID'],
                json: json
            });
        },
        isValid: function(battle, playerID) {
            var unit = battle.getUnitByID(this.unitID);
            return unit && unit.ownerID === playerID;
        }
    });

    function tileIsClear(time, ship, unit, tile) {
        var units = ship.unitsMap.at(tile.x, tile.y),
            arrivalTime = time + unit.getTimeForMoving(unit, tile, ship);
        return (!units ||//there's no unit ahead
            _.all(units, function(u) {
                return !u.isAlive() ||//or they're either dead...
                    (u.moving && //...or they're going away
                    !v.equal(u.moving.dest, tile) &&
                    u.moving.arrivalTime <= arrivalTime
                    );
            })) &&

            !_.any(ship.units,
                function(u) {
                    //no unit is moving there
                    return u.id !== unit.id &&
                        u.moving &&
                        v.equal(u.moving.dest, tile);
                });
    }

    sh.orders = {};

    //Abstract class
    sh.orders.GoTo = sh.Order.extendShared({
        init: function(json) {
            this.parent(json);
        },
        goTo: function(pos, battle) {
            var self = this,
                unit = battle.getUnitByID(this.unitID),
                ship = unit.ship;
            this.goToState = {
                to: pos,
                arrived: false,
                path: self.getPath(unit, pos, ship),
                pathIndex: 1
            };
        },
        getPath: function(from, to, ship) {
            if (!this.gridForPath) {
                this.gridForPath = new PF.Grid(ship.width, ship.height,
                    ship.getPfMatrix());
            }
            return pathfinder.findPath(from.x, from.y, to.x, to.y,
                this.gridForPath.clone());
        },
        getMoveAction: function(time, battle) {
            var state = this.goToState,
                unit,
                ship,
                nextTile,
                from;
            if (state && !state.arrived) {
                unit = battle.getUnitByID(this.unitID);
                ship = unit.ship;
                if (v.equal(unit, state.to)) {
                    //unit is already at destination
                    state.arrived = true;
                    return null;
                }
                if (unit.moving) {
                    return null;
                }
                if (!state.path || state.pathIndex >= state.path.length) {
                    this.goToState.arrived = true;
                    return null;
                }
                nextTile = {x: state.path[state.pathIndex][0],
                    y: state.path[state.pathIndex][1]};
                if (tileIsClear(time, ship, unit, nextTile)) {
                    from = {x: unit.x, y: unit.y};
                    state.pathIndex++;
                    return new actions.Move({
                        unitID: unit.id,
                        from: from,
                        to: nextTile,
                        duration: unit.getTimeForMoving(from, nextTile, ship)
                    });
                }
                return null;
            }
            return null;
        }
    });
    sh.orders.Move = sh.orders.GoTo.extendShared({
        init: function(json) {
            this.parent(json);
            //in case its a me.Vector2D
            json.destination = {
                x: parseInt(json.destination.x, 10),
                y: parseInt(json.destination.y, 10)
            };
            this.setJson({
                type: 'Move',
                properties: ['destination'],
                json: json
            });
        },
        /**
         * Returns the actions for the unit to do while the order is the
         * active one.
         * @param {int} time
         * @param {sh.Battle} battle
         * @return {Array}
         */
        getActions: function(time, battle) {
            var move;
            if (!this.goToState) {
                this.goTo(this.destination, battle);
            }
            if (!this.goToState.arrived) {
                move = this.getMoveAction(time, battle);
                return move ? [move] : [];
            }
            return [new actions.FinishOrder({
                unitID: this.unitID
            })];
        },
        toString: function() {
            return 'Move to ' + v.str(this.destination);
        },
        isValid: function(battle, playerID) {
            var ship = battle.getUnitByID(this.unitID).ship;
            return this.parent(battle, playerID) &&
                ship.isWalkable(this.destination.x, this.destination.y);
        }
    });

    sh.orders.MoveToConsole = sh.orders.Move.extendShared({
        init: function(json) {
            this.parent(json);
            this.setJson({
                type: 'MoveToConsole',
                properties: [],
                json: json
            });
        },
        toString: function() {
            return 'Move to Console';
        },
        isValid: function(battle, playerID) {
            var ship = battle.getUnitByID(this.unitID).ship;
            return this.parent(battle, playerID) &&
                ship.itemsMap.at(this.destination.x,
                    this.destination.y) instanceof items.Console;
        }
    });

    sh.orders.SeekAndDestroy = sh.orders.GoTo.extendShared({
        init: function(json) {
            this.parent(json);
            this.setJson({
                type: 'SeekAndDestroy',
                properties: ['targetID'],
                json: json
            });
        },
        getActions: function(time, battle) {
            var unit, target, move;
            unit = battle.getUnitByID(this.unitID);
            target = battle.getUnitByID(this.targetID);
            if (!target || !target.isAlive() || unit.ship !== target.ship) {
                //unit is already dead
                return [new actions.SetUnitProperty({
                    unitID: unit.id,
                    property: 'targetID',
                    value: null
                }),
                    new actions.FinishOrder({
                        unitID: unit.id
                    })];
            }
            if (unit.targetID === null || unit.targetID === undefined) {
                return [new actions.SetUnitProperty({
                    unitID: unit.id,
                    property: 'targetID',
                    value: target.id
                })];
            }
            if (unit.moving) {
                return [];
            }
            if (unit.isInRange(target)) {
                return [];
            }
            if (!this.goToState ||
                    this.pathOutOfTarget(this.goToState.path, target)) {
                this.goTo(target, battle);
            }
            move = this.getMoveAction(time, battle);
            return move ? [move] : [];
        },
        pathOutOfTarget: function(path, target) {
            var pathLast = _.last(path);
            pathLast = {x: pathLast[0], y: pathLast[1]};
            return !v.equal(pathLast, target);
        },
        toString: function() {
            return 'Seek & Destroy';
        },
        isValid: function(battle, playerID) {
            var unit = battle.getUnitByID(this.unitID),
                target = battle.getUnitByID(this.targetID);
            return this.parent(battle, playerID) &&
                target &&
                target.isAlive() &&
                unit.isEnemy(target) &&
                unit.ship === target.ship;
        }
    });

    sh.orders.Recall = sh.Order.extendShared({
        init: function(json) {
            this.parent(json);
            this.setJson({
                type: 'Recall',
                properties: [],
                json: json
            });
        },
        getActions: function() {//(turnTime, battle)
            return [new actions.Recall({
                unitID: this.unitID
            }),
                new actions.FinishOrder({
                    unitID: this.unitID
                })];
        },
        toString: function() {
            return 'Recall';
        },
        isValid: function(battle, playerID) {
            var unit = battle.getUnitByID(this.unitID);
            return this.parent(battle, playerID) &&
                unit.teleportSource;
        }
    });
}());