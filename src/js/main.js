/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global me, _, utils, $, WeaponItem, EngineItem, ConsoleItem,
ComponentItem, WallItem, DoorItem, PowerItem,
RedColorObject, charMap*/


var WIDTH, HEIGHT, TILE_SIZE, ship, ui, screen;
// game resources
// in the case of the items, set their image name equal to their type.
var g_resources = [{
    name: 'outline',
    type: 'image',
    src: 'data/img/render/outline.png'
}, {
    name: 'selector',
    type: 'image',
    src: 'data/img/render/selector.png'
}, {
    name: 'weapon',
    type: 'image',
    src: 'data/img/render/weapon_01.png'
}, {
    name: 'engine',
    type: 'image',
    src: 'data/img/render/engine_01.png'
}, {
    name: 'power',
    type: 'image',
    src: 'data/img/render/power_01.png'
}, {
    name: 'console',
    type: 'image',
    src: 'data/img/render/console_02.png'
}, {
    name: 'component',
    type: 'image',
    src: 'data/img/render/components_01.png'
}, {
    name: 'door',
    type: 'image',
    src: 'data/img/render/door_01.png'
}, {
    name: 'wall',
    type: 'image',
    src: 'data/img/render/wall_001.png'
}, {
    name: 'colTile',
    type: 'image',
    src: 'data/img/render/metatiles32x32.png'
}, {
    name: 'area_01',
    type: 'tmx',
    src: 'data/outlines/small.tmx'
}, {
    name: 'test',
    type: 'tmx',
    src: 'data/outlines/test.tmx'
}];

var g_resources_size = [{
    name: 'outline',
    width: 192,
    height: 256
}, {
    name: 'small',
    width: 576,
    height: 384
}];

var items = {
    weapon: WeaponItem,
    engine: EngineItem,
    power: PowerItem,
    console: ConsoleItem,
    component: ComponentItem,
    door: DoorItem,
    wall: WallItem
};

/*Everything related to the graphics during the process of building */
function UserInterface() {
    'use strict';
    this.chosen = null; //the chosen object from the panel (an ItemObject)
    this.mouseLockedOn = null; //who the mouse actions pertain to.
    this.ghostItems = {}; //Items that exist for the sole purpose of...
    // ...showing the position at which they will be built.
    this.init = function() {
        var type, newItem;
        this.ghostItems = {};//Items to be used when choosing building location
        for (type in items) {
            if (items.hasOwnProperty(type)) {
                newItem = utils.makeItem(type);
                this.ghostItems[type] = newItem;
                newItem.hide();
                me.game.add(newItem, newItem.zIndex + 1000);
                newItem.onShip(false);
            }
        }
        this.greenSpots = utils.getEmptyMatrix(WIDTH, HEIGHT, 0);
    };
    this.choose = function(name) {
        if (this.chosen) {
            if (this.chosen.type === name) {
                return;
            }
            this.chosen.hide();
            this.clearRed();
            $('#item_' + ui.chosen.type).removeClass('chosen');

            me.game.repaint();
        }
        this.chosen = this.ghostItems[name];
        if (!this.chosen) {
            this.chosen = null;
            return;
        }
        var mouse = utils.getMouse();
        this.chosen.x(mouse.x)
            .y(mouse.y)
            .show();
        this.updateGreenSpots();

        $('#item_' + ui.chosen.type).addClass('chosen');
        me.game.sort();
        me.game.repaint();
    };
    this.moveGhost = function(x, y) {
        this.chosen.x(x).y(y);
        //Rotate if it fits somewhere
        if (!this.chosen.rotated() && this.chosen.canBuildRotated(x, y)) {
            this.chosen.rotated(true);
        }
        if (this.chosen.rotated() && this.chosen.canBuildAt(x, y)) {
            this.chosen.rotated(false);
        }
        this.updateRed();
    };
    //Dragging
    this.dragging = null;
    this.beginDrag = function(building) {
        if (this.chosen) {
            console.log('There should be nothing chosen when drag begins. ' +
                '(ui.beginDrag)');
        }
        building.hide();
        ship.buildingsMap.update();
        this.choose(building.type);
        this.dragging = building;
    };
    this.endDrag = function() {
        if (!this.dragging) {
            return;
        }
        var mouse = utils.getMouse();
        if (this.dragging.canBuildAt(mouse.x, mouse.y)) {
            this.dragging.x(mouse.x).y(mouse.y);
        }
        this.dragging.show();
        ship.buildingsMap.update();
        this.choose();
        this.dragging = null;
    };
    //Red overlay
    this.redScreen = [];
    this.redIndex = 0;
    this.printRed = function(x, y) {
        this.redScreen[this.redIndex] = new RedColorObject(x, y, {});
        me.game.add(this.redScreen[this.redIndex],
        this.redScreen[this.redIndex].zIndex + 1000);
        this.redIndex++;
    };
    this.clearRed = function() {
        var i = 0;
        for (i = this.redIndex; i > 0; i--) {
            me.game.remove(this.redScreen[i - 1]);
            delete this.redScreen[i - 1];
        }
        this.redIndex = 0;
    };
    this.updateRed = function() {
        this.clearRed();
        var self = this;
        utils.itemTiles(this.chosen, function(iX, iY) {
            if (self.greenSpots[iY][iX] === 0) {
                self.printRed(iX, iY);
            }
        });
    };
    //A matrix of 1 and 0. In 0 should be red overlay when trying to build
    this.greenSpots = null;
    this.updateGreenSpots = function() {
        var self = this;
        if (!this.chosen) {
            return;
        }
        self.greenSpots = utils.getEmptyMatrix(WIDTH, HEIGHT, 0);
        utils.levelTiles(function(x, y) {
            var i, j, cWidth, cHeight;
            if (self.chosen.canBuildAt(x, y)) {
                cWidth = self.chosen.size[0];
                cHeight = self.chosen.size[1];
            }
            if (self.chosen.canBuildRotated(x, y)) {
                cWidth = self.chosen.size[1];
                cHeight = self.chosen.size[0];
            }
            for (i = x; i < cWidth + x && i < WIDTH; i++) {
                for (j = y; j < cHeight + y && j < HEIGHT; j++) {
                    self.greenSpots[j][i] = 1;
                }
            }
        });
    };
    this.drawingScreen = [];
    //draws arbitrary stuff
    this.draw = function(x, y, type) {
        var item = utils.makeItem(type).x(x).y(y);
        me.game.add(item, item.zIndex + 1000);
        this.drawingScreen.push(item);
        me.game.sort();
        me.game.repaint();

    };
    this.clear = function() {
        _.each(this.drawingScreen, function(i) {
            me.game.remove(i, true);
        });
        this.drawingScreen = [];
        this.clearRed();

        me.game.sort();
        me.game.repaint();
    };

    //combines the ship map with the drawing screen
    this.mapAt = function(x, y) {
        var i, shipTile = null;
        for (i = 0; i < this.drawingScreen.length; i++) {
            if (this.drawingScreen[i].occupies(x, y)) {
                return this.drawingScreen[i];
            }
        }
        if (ship.map()[y] !== undefined && ship.map()[y][x] !== undefined) {
            shipTile = ship.map()[y][x];
        }
        if (shipTile === charMap.codes._cleared && this.chosen &&
            this.chosen.occupies(x, y)) {
            return this.chosen;
        }
        return shipTile;
    };
    this.init();
}


function Ship() {
    'use strict';
    this._buildings = [];
    this.buildings = function() {
        return this._buildings;
    };
    //this should be called when the user builds something
    this.buildAt = function(x, y, buildingType) {
        var self = this,
        building = utils.makeItem(buildingType),
        canBuild = building.canBuildAt(x, y),
        canBuildRotated;
        if (!canBuild) {
            canBuildRotated = building.canBuildRotated(x, y);
            if (canBuildRotated) {
                building.rotated(true);
            }
        }
        if (canBuild || canBuildRotated) {
            building.x(x).y(y);
            //remove anything in its way
            utils.itemTiles(building, function(iX, iY) {
                self.removeAt(iX, iY);
            });
            this.add(building);
            building.onBuilt();
            return building; //building successful
        }
        return null; //building failed
    };

    //Adds an item to the ship ignoring its placement rules
    this.add = function(item) {
        me.game.add(item, item.zIndex);
        item.onShip(true);
        this.buildingsChanged();
    };
    this.removeAt = function(x, y) {
        while (this.mapAt(x, y).name === 'item') {
            this.remove(this.mapAt(x, y), true);
        }
    };
    this.remove = function(item, updateBuildings) {
        if (!item) {
            return;
        }
        if (updateBuildings === undefined) {
            updateBuildings = true; //updates by default
        }
        me.game.remove(item, true);

        if (updateBuildings) {
            this.buildingsChanged();
        }
    };

    this.removeAll = function() {
        var self = this;
        _.each(this.buildings(), function(building) {
            self.remove(building, false);
        });
        this.buildingsChanged();
    };
    //to call whenever buildings change
    this.buildingsChanged = function() {
        this._buildings = _.filter(me.game.getEntityByName('item'),
            function(item) {
                return item.onShip();
            });
        this.buildingsMap.update();
        ui.updateGreenSpots();
    };
    this._map = null;
    this.map = function() {
        if (this.buildingsMap.changed || this.hullMap.changed ||
            this._map === null) {
            this._map = this._getJointMap();
            this.buildingsMap.changed = false;
            this.hullMap.changed = false;
        }
        return this._map;
    };
    this.mapAt = function(x, y) {
        if (ship.map()[y] !== undefined && ship.map()[y][x] !== undefined) {
            return ship.map()[y][x];
        }
        return null;
    };
    this.buildingsMap = {
        changed: true,
        _buildingsMap: null,
        update: function() {
            var self = this;
            self._buildingsMap = utils.getEmptyMatrix(WIDTH, HEIGHT,
                charMap.codes._cleared);
            _.each(ship.buildings(), function(b) {
                if (!b.hidden()) {
                    utils.itemTiles(b, function(x, y) {
                        self._buildingsMap[y][x] = b;
                    });
                }
            });

            this.changed = true;
        },
        get: function() {
            if (this._buildingsMap === null) {
                this.update();
            }
            return this._buildingsMap;
        }
    };
    this.hullMap = {
        changed: true,
        _hullMap: null,
        update: function() {
            this._hullMap = charMap.get();
            this._changed = true;
        },
        get: function() {
            if (this._hullMap === null) {
                this.update();
            }
            return this._hullMap;
        }
    };
    //joins hullMap and buildingsMap
    this._getJointMap = function() {
        var self = this,
        joint = utils.getEmptyMatrix(WIDTH, HEIGHT, charMap.codes._cleared);
        utils.levelTiles(function(x, y) {
            joint[y][x] = self.hullMap.get()[y][x];
            if (self.buildingsMap.get()[y][x] !== charMap.codes._cleared) {
                joint[y][x] = self.buildingsMap.get()[y][x];
            }
        });
        return joint;
    };
    this.toJsonString = function() {
        return JSON.stringify(_.map(this.buildings(), function(b) {
            return {
                type: b.type,
                x: b.x(),
                y: b.y(),
                rotated: b.rotated()
            };
        }));
    };
    this.fromJsonString = function(jsonString) {
        var itemArray, item, i;
        this.removeAll();
        itemArray = JSON.parse(jsonString);
        for (i = 0; i < itemArray.length; i++) {
            item = utils.makeItem(itemArray[i].type);
            item.x(itemArray[i].x)
                .y(itemArray[i].y)
                .rotated(itemArray[i].rotated);
            this.add(item);
        }
        this.buildingsChanged();
    };

}

/* the in game stuff*/
var PlayScreen = me.ScreenObject.extend({
    iItemID: 0,

    init: function(shipName) {
        'use strict';
        this.parent(true);
        this.shipName = shipName;
    },
    onResetEvent: function() {
        'use strict';
        this.parent(true);
        me.game.reset();
        // stuff to reset on state change
        me.levelDirector.loadLevel(this.shipName);
        window.TILE_SIZE = me.game.currentLevel.tilewidth;
        window.WIDTH = me.game.currentLevel.width;
        window.HEIGHT = me.game.currentLevel.height;
        me.game.sort();
        me.input.bindKey(me.input.KEY.ESC, 'escape');
        me.input.registerMouseEvent('mousedown', me.game.viewport,
            this.mouseDown.bind(this));
        me.input.registerMouseEvent('mousemove', me.game.viewport,
            this.mouseMove.bind(this));
        me.input.registerMouseEvent('mouseup', me.game.viewport,
            this.mouseUp.bind(this));

        me.video.getScreenCanvas()
            .addEventListener('dblclick', this.mouseDbClick, false);

        window.ui = new UserInterface();
        window.ship = new Ship();
    },

    update: function() {
        'use strict';
        this.addAsObject = true;
        if (me.input.isKeyPressed('escape')) {
            if (ui.mouseLockedOn) {
                ui.mouseLockedOn.lockedEscape();
                return;
            }
            if (ui.chosen) {
                ui.choose();
            }
        }
    },
    mouseDbClick: function(e) {
        'use strict';
        var mouseTile;
        //e.which--;//A fix.
        mouseTile = utils.getMouse();
        if (ui.mouseLockedOn) { //the mouse is involved in a specific object
            //delegate handling to the object
            ui.mouseLockedOn.lockedMouseDbClick(mouseTile);
            return;
        }

        me.game.sort();
        me.game.repaint();
    },
    mouseDown: function(e) {
        'use strict';
        var mouseTile, item, which;
        which = e.which - 1;
        mouseTile = utils.getMouse();
        if (ui.mouseLockedOn) { //the mouse is involved in a specific object
            //delegate handling to the object
            ui.mouseLockedOn.lockedMouseDown(mouseTile);
            return;
        }

        item = ship.mapAt(mouseTile.x, mouseTile.y);
        if (item !== null && item.name === 'item') {
            if (which === me.input.mouse.RIGHT) {
                ship.remove(item);
                ui.updateRed();
            } else {
                ui.selected = item;
                if (!ui.chosen) {
                    ui.beginDrag(item);
                }
            }
        }
        me.game.sort();
        me.game.repaint();
    },
    mouseMove: function() {
        'use strict';
        var mouseTile = utils.getMouse();
        if (ui.mouseLockedOn) { //the mouse is involved in a specific object
            //delegate handling to the object
            ui.mouseLockedOn.lockedMouseMove(mouseTile);
            return;
        }
        if (!ui.chosen) {
            return;
        }
        ui.moveGhost(mouseTile.x, mouseTile.y);
        me.game.sort();
        me.game.repaint();

    },
    mouseUp: function(e) {
        'use strict';
        var mouseTile, which;
        which = e.which - 1;
        mouseTile = utils.getMouse();
        if (ui.mouseLockedOn) { //the mouse is involved in a specific object
            //delegate handling to the object
            ui.mouseLockedOn.lockedMouseUp(mouseTile);
            return;
        }

        if (ui.chosen && !ui.dragging) {
            if (which !== me.input.mouse.RIGHT) {
                ship.buildAt(mouseTile.x, mouseTile.y, ui.chosen.type);
            }
        } else if (ui.dragging) {
            ui.endDrag();
        }

        me.game.sort();
        me.game.repaint();

    },
    /* ---
    action to perform when game is finished (state change)
    --- */
    onDestroyEvent: function() {
        'use strict';
    }
});

// jsApp
var jsApp = {
    /* ---

     Initialize the jsApp

     --- */
    onload: function(shipName) {
        'use strict';
        // init the video
        if (!me.video.init('jsapp', 576, 384)) {
            alert('Sorry but your browser does not support html 5 canvas.');
            return;
        }
        // initialize the "audio"
        //        me.audio.init("mp3,ogg");
        // set all resources to be loaded
        me.loader.onload = this.loaded.bind(this, shipName);
        // set all resources to be loaded
        me.loader.preload(g_resources);
        // load everything & display a loading screen
        me.state.change(me.state.LOADING);
    },
    /* ---
     callback when everything is loaded
     --- */
    loaded: function(shipName) {
        'use strict';
        // set the "Play/Ingame" Screen Object
        window.screen = new PlayScreen(shipName);
        me.state.set(me.state.PLAY, screen);
        // start the game
        me.state.change(me.state.PLAY);
    }
};

