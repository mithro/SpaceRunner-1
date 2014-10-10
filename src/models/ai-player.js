/*
 -*- coding: utf-8 -*-
 * vim: set ts=4 sw=4 et sts=4 ai:
 * Copyright 2013 MITHIS
 * All rights reserved.
 */

/*global require, exports*/

var sh = require('../public/js/shared'),
    _ = require('underscore')._;


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

    function addOrderToArray(unit, orderArray, order) {
        var unitOrders = new sh.UnitOrders({unitID: unit.id});
        unitOrders.array = [order];
        orderArray.addUnitOrders(unitOrders);
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
            addOrderToArray(unit, orders, new sh.orders.Move({
                unitID: unit.id,
                destination: pathDestination(getShortest(paths))
            }));
            return true;
        }
        return false;
    }

    function setSeekAndDestroyOrderForShortestPath(grid, unit, targets,
                                                   orders) {
        var paths = getPaths(grid.clone(), unit, targets);
        if (paths.length > 0) {
            addOrderToArray(unit, orders, new sh.orders.SeekAndDestroy({
                unitID: unit.id,
                targetID: _.find(targets, function(t) {
                    return sh.v.equal(pathDestination(getShortest(paths)), t);
                }).id
            }));
            return true;
        }
        return false;
    }

    /**
     * An AI controlled player.
     * @type {*}
     */
    AIPlayer = sh.Player.extendShared({
        init: function(name, battleServer) {
            this.parent({
                id: -1,
                name: name
            });
            this.battleServer = battleServer;
            this.battle = battleServer.battleModel;
        },
        prepareForBattle: function() {
            this.ownShip = this.battle.getPlayerShips(this.id)[0];
            this.enemyShip = this.battle.getEnemyShips(this.id)[0];
        },
        /**
         * Gets the orders that the player would give for the current turn.
         */
        getOrders: function() {
            var orders = new sh.OrderCollection();
            this.setOrdersInOwnShip(orders);
            this.setOrdersInEnemyShip(orders);
            return orders;
        },
        enemyUnits: function(ship) {
            return _.filter(ship.units, function(u) {
                return u.ownerID !== this.id;
            }, this);
        },
        setOrdersInOwnShip: function (orders) {
            var ship = this.ownShip,
                grid = new sh.PF.Grid(ship.width, ship.height,
                    ship.getPfMatrix()),
                units = _.groupBy(ship.getPlayerUnits(this.id), 'type'),
                enemyUnits = this.enemyUnits(ship),
                weaponConsoles = _.filter(ship.built, function(item) {
                    return item.type === 'Console' &&
                        item.getControlled().type === 'Weapon';
                });
            _.each(weaponConsoles, function(console, index) {
                var unit = units.Critter[index];
                if (!unit || unit.orders.length > 0) {
                    return;
                }
                addOrderToArray(unit, orders, new sh.orders.Move({
                    unitID: unit.id,
                    destination: console
                }));
            });
            //SEEK & DESTROY
            _.each(units.MetalSpider, function(unit) {
                setSeekAndDestroyOrderForShortestPath(grid.clone(), unit,
                    enemyUnits, orders);
            });
        },
        setOrdersInEnemyShip: function (orders) {
            var ship = this.enemyShip,
                grid = new sh.PF.Grid(ship.width, ship.height,
                    ship.getPfMatrix()),
                gridWithUnits = makeUnitsUnwalkable(ship, grid.clone()),
                myUnits = _.groupBy(ship.getPlayerUnits(this.id), 'type'),
                enemyUnits = this.enemyUnits(ship),
                free = [],
                occupied = [];

            //Get occupied and free tiles in weak spot.
            _.each(getWeakSpotsTiles(ship), function(tile) {
                if (_.any(myUnits, function(unit) {
                        return unit.x === tile.x && unit.y === tile.y;
                    })) {
                    occupied.push(tile);
                } else {
                    free.push(tile);
                }
            });

            //GO TO THE WEAK SPOT
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

            //SEEK & DESTROY
            _.each(myUnits.MetalSpider, function(unit) {
                setSeekAndDestroyOrderForShortestPath(grid.clone(), unit,
                    enemyUnits, orders);
            });
        }
    });
    exports.AIPlayer = AIPlayer;
}(exports));
