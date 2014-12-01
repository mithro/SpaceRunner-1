/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global me, require, exports, module*/

var sh = module.exports,
    TileEntity = require('./tile-entity').TileEntity,
    _ = require('underscore')._,
    pr = require('../placement-rules').pr,
    gen = require('../general-stuff'),
    GRID_SUB = gen.GRID_SUB,
    tiles = gen.tiles;
/**
 * Represents a component from the ship (Engine, Weapon, etc).
 * @type {*}
 */
sh.Item = TileEntity.extendShared({
    size: [1, 1],
    walkable: false,
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Item',
            properties: [],
            json: json
        });
        if (json) {
            this.rotated(json.r);
            this.ship = json.ship;
        }
    },
    canBuildAt: function(x, y, ship) {
        'use strict';
        //default placement rule
        return this.placementRule
            .compliesAt(x, y, ship.map);
    },
    canBuildRotated: function() {//(x, y, ship)
        'use strict';
        //default placement rule
        return false;
    },
    _rotated: false,
    rotated: function(rotated) {
        'use strict';
        if (rotated === undefined) {
            return this._rotated;
        }
        this._rotated = rotated;
        return this;
    },
    //takes rotation into account
    trueSize: function(index) {
        'use strict';
        if (index === undefined) { //can pass an index: 0= width, 1= height
            return this.rotated() ? [this.size[1], this.size[0]] : this.size;
        }
        if (this.rotated()) {
            index = (index === 1) ? 0 : 1; //toggles 1 and 0
        }
        return this.size[index];
    },

    onBuilt: function() {
        'use strict';
        //abstract method
        return null;//for jsLint
    },
    onShip: function(ship) {
        'use strict';
        if (ship === undefined) {
            return this.ship;
        }
        this.ship = ship;
        return this;
    },
    toJson: function() {
        'use strict';
        var json = this.parent();
        json.r = this.rotated();
        return json;
    },
    setSize: function(width, height) {
        'use strict';
        this.size = [width, height];
        this.onSizeChanged();
    },
    onSizeChanged: function() {
        'use strict';
        this.placementRule = pr.make.spaceRule(tiles.clear,
            this.size[0], this.size[1]);
    }
});

/**
 * Enumerates all the concrete item constructors.
 * @type {{}}
 */
sh.items = {};

/**
 * A Weapon.
 * @type {*}
 */
sh.items.Weapon = sh.Item.extendShared({
    chargeTime: 2500,
    damage: 100,
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Weapon',
            properties: [],
            json: json
        });
        this.setSize(2 * GRID_SUB, 2 * GRID_SUB);
    },
    canBuildAt: function(x, y, ship) {
        'use strict';
        return pr.weapon.compliesAt(x, y, ship.map);
    }
});

/**
 * An Engine.
 * @type {*}
 */
sh.items.Engine = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Engine',
            properties: [],
            json: json
        });
        this.setSize(2 * GRID_SUB, 2 * GRID_SUB);
    },
    canBuildAt: function(x, y, ship) {
        'use strict';
        return pr.Engine.compliesAt(x, y, ship.map);
    }
});

/**
 * Power!
 * @type {*}
 */
sh.items.Power = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Power',
            properties: [],
            json: json
        });
        this.setSize(2 * GRID_SUB, 2 * GRID_SUB);
    }
});

/**
 * The Console next to the Power, Weapon or Engine.
 * A unit must run these items from the console.
 * @type {*}
 */
sh.items.Console = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Console',
            properties: [],
            json: json
        });
        this.setSize(GRID_SUB, GRID_SUB);
        this.walkable = true;
    },
    canBuildAt: function(x, y, ship) {
        'use strict';
        return pr.console.compliesAt(x, y, ship.map);
    },
    /**
     * Get the item that is controlled by this console.
     * @return {sh.Item}
     */
    getControlled: function() {
        'use strict';
        var x, y, atTile;
        if (this.controlled) {
            return this.controlled;
        }
        //assign controlled (the item being controlled by this console)
        for (y = this.y + GRID_SUB; y >= this.y - GRID_SUB;
                y -= GRID_SUB) {
            for (x = this.x - GRID_SUB; x <= this.x + GRID_SUB;
                    x += GRID_SUB) {
                atTile = this.ship.itemsMap.at(x, y);
                if (atTile.type === 'Weapon' || atTile.type === 'Engine' ||
                        atTile.type === 'Power') {
                    this.controlled = atTile;
                    return this.controlled;
                }
            }
        }
    }
});

/**
 * Component.
 * @type {*}
 */
sh.items.Component = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Component',
            properties: [],
            json: json
        });
        this.setSize(2 * GRID_SUB, 2 * GRID_SUB);
    }
});

/**
 * Door. Can be placed on top of a Wall or between two Walls.
 * @type {*}
 */
sh.items.Door = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Door',
            properties: [],
            json: json
        });
        this.setSize(2 * GRID_SUB, GRID_SUB);
        this.walkable = true;
    },
    canBuildAt: function(x, y, ship) {
        'use strict';
        return pr.door.compliesAt(x, y, ship.map);
    },
    canBuildRotated: function(x, y, ship) {
        'use strict';
        return pr.doorRotated.compliesAt(x, y, ship.map);
    }
});

/**
 * An individual Wall tile.
 * @type {*}
 */
sh.items.Wall = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Wall',
            properties: [],
            json: json
        });
        this.setSize(GRID_SUB, GRID_SUB);
        this.connected = {
            top: false,
            left: true,
            bottom: false,
            right: true
        };
    },
    canBuildAt: function(x, y, ship) {
        'use strict';
        return this.parent(x, y, ship) ||
            ship.at(x, y) instanceof sh.items.Wall;
    },
    onBuilt: function() {
        'use strict';

        var top = this.ship.at(this.x, this.y - GRID_SUB),
            left = this.ship.at(this.x - GRID_SUB, this.y),
            bot = this.ship.at(this.x, this.y + GRID_SUB),
            right = this.ship.at(this.x + GRID_SUB, this.y);
        this.updateConnections(top, left, bot, right);
    },
    updateConnections: function(top, left, bot, right) {
        'use strict';
        //modify self and surrounding Walls' connections
        var it = sh.items,
            x = this.x,
            y = this.y;
        //reset
        this.connected.top = false;
        this.connected.left = false;
        this.connected.bottom = false;
        this.connected.right = false;

        if (top instanceof it.Wall) {
            top.connected.bottom = true;
            this.connected.top = true;
        } else if (top instanceof it.Door && top.rotated() &&
                top.y === y - 2 * GRID_SUB) {
            this.connected.top = true;
        }
        if (left instanceof it.Wall) {
            left.connected.right = true;
            this.connected.left = true;
        } else if (left instanceof it.Door && !left.rotated() &&
                left.x === x - 2 * GRID_SUB) {
            this.connected.left = true;
        }
        if (bot instanceof it.Wall) {
            bot.connected.top = true;
            this.connected.bottom = true;
        } else if (bot instanceof it.Door && bot.rotated() &&
                bot.y === y + GRID_SUB) {
            this.connected.bottom = true;
        }
        if (right instanceof it.Wall) {
            right.connected.left = true;
            this.connected.right = true;
        } else if (right instanceof it.Door && !right.rotated() &&
                right.x === x + GRID_SUB) {
            this.connected.right = true;
        }
    },
    isHorizontal: function() {
        'use strict';
        return !this.connected.top && !this.connected.bottom;
        //(because it's the default state)
    },
    isVertical: function() {
        'use strict';
        return !this.connected.left && !this.connected.right &&
            (this.connected.top || this.connected.bottom);
    }
});

/**
 * Weak spot.
 * @type {*}
 */
sh.items.WeakSpot = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'WeakSpot',
            properties: [],
            json: json
        });
        this.setSize(2 * GRID_SUB, 2 * GRID_SUB);
        this.walkable = true;
    }
});

/**
 * Teleports units that are standing on it.
 * @type {*}
 */
sh.items.Teleporter = sh.Item.extendShared({
    init: function(json) {
        'use strict';
        this.parent(json);
        this.setJson({
            type: 'Teleporter',
            properties: [],
            json: json
        });
        this.setSize(GRID_SUB, GRID_SUB);
        this.walkable = true;
    },
    /**
     * This method will be called by the script creator every time something
     * changed. The item's properties should not be changed in this method;
     * the script creator does that through the modelChanges array found in
     * each action.
     * @param {int} turnTime The current time.
     * @param {sh.Battle} battle The battle, representing the entire model
     * @return {Array}
     */
    getActions: function(turnTime, battle) {
        'use strict';
        var self = this,
            actions = [],
            Teleport = require('./actions').actions.Teleport;
        this.tiles(function(x, y) {
            _.each(self.ship.unitsMap.at(x, y), function(unit) {
                actions.push(new Teleport({
                    unitID: unit.id,
                    targetShipID: _.find(battle.ships, function(ship) {
                        return ship.id !== self.ship.id;
                    }).id,
                    teleporterID: self.id
                }));
            });
        });
        return actions;
    }
});