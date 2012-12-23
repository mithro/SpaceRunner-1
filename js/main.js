/*
-*- coding: utf-8 -*-
 vim: set ts=4 sw=4 et sts=4 ai:
 */

// game resources
var g_resources = [
    {name: "outline",   type: "image", src: "data/img/render/outline.png"},
    {name: "selector",  type: "image", src: "data/img/render/selector.png"},
    {name: "weapon",    type: "image", src: "data/img/render/weapon_01.png"},
    {name: "engine",    type: "image", src: "data/img/render/engine_01.png"},
    {name: "power",     type: "image", src: "data/img/render/power_01.png"},
    {name: "console",   type: "image", src: "data/img/render/console_02.png"},
    {name: "component", type: "image", src: "data/img/render/components_01.png"},
    {name: "door",      type: "image", src: "data/img/render/door_01.png"},
    {name: "wall",      type: "image", src: "data/img/render/wall_001.png"},
    {name: "colTile",   type: "image", src: "data/img/render/metatiles32x32.png"},
    {name: "area_01",   type: "tmx",   src: "data/outlines/small.tmx"},
    {name: "test",      type: "tmx",   src: "data/outlines/test.tmx"}
    ];
    
var g_resources_size = [
    {name: "outline",   width: 192, height: 256},
    {name: "small",     width: 576, height: 384},
    {name: "selector",  width:  32, height:  32},
    {name: "weapon",    width:  96, height:  64},
    {name: "engine",    width:  96, height:  64},
    {name: "power",     width:  64, height:  64},
    {name: "console",   width:  32, height:  32},
    {name: "component", width:  64, height:  64},
    {name: "door",      width:  64, height:  32},
    {name: "wall",      width:  32, height:  32},
    {name: "colTile",   width: 160, height:  32},
    ];


var items = {
    getBy: function (property, value) {
        for(var p in this) {
            if(this[p][property] == value) return this[p];
        }
        return null;
    },
    addNames: function () {
        for(var p in this) {
            this[p].name = p;
        }
    },
    weapon: {index:3, Constructor: iWeaponObject, code: "W"},
    engine: {index:4, Constructor: iEngineObject, code: "E"},
    power: {index:5, Constructor: iPowerObject, code: "P"},
    console: {index: 6 ,Constructor: iConsoleObject, code:"C"},
    component: {index: 7 ,Constructor: iComponentObject, code:"O"},
    door: {index: 8 ,Constructor: iDoorObject, code:"D"},
    wall: {index: 9 ,Constructor: iWallObject, code:"+"}
};
items.addNames();

//For loading different ships by adding ship=<name> in the query string.
function getQueriedShip() {
    var defaultShip = "area_01";
    var ship = getParameterByName("ship");
    if(ship === null) return defaultShip;
    for (var i = 0; i < g_resources.length; i++) {
        if(g_resources[i].name == ship && g_resources[i].type == "tmx") {
            return ship;
        }
    }
    alert("Ship \"" + ship + "\" doesn't exist. Loading \""+defaultShip+"\" instead.");
    return defaultShip;
}

var select_item = -1;
var isSelectObject = false;
var SelectObject = null;
var isDragable = false;
var wallDrawing = false;
var DeleteObject = null;

var TILE_SIZE = 0;

//var weaponmng = new WeaponMng();

var jsApp = {
    /* ---

     Initialize the jsApp

     --- */
    onload: function() {
        // init the video
        if (!me.video.init('jsapp', g_resources_size[1].width, g_resources_size[1].height)) {
            alert("Sorry but your browser does not support html 5 canvas.");
            return;
        }
        // initialize the "audio"
//        me.audio.init("mp3,ogg");
        // set all resources to be loaded
        me.loader.onload = this.loaded.bind(this);
        // set all resources to be loaded
        me.loader.preload(g_resources);
        // load everything & display a loading screen
        me.state.change(me.state.LOADING);
    },
    /* ---
     callback when everything is loaded
     --- */
    loaded: function() {
        // set the "Play/Ingame" Screen Object
        me.state.set(me.state.PLAY, new PlayScreen());
        // start the game
        me.state.change(me.state.PLAY);
        
        
    },
    // get tile row and col from pixels
    getTilePosition: function(x, y) {
        var pos = {};
        pos.x = Math.floor(x / me.game.currentLevel.tilewidth);
        pos.y = Math.floor(y / me.game.currentLevel.tileheight);
        return pos;
    },
    // get tile position in pixels from pixels
    getTilePosPixels: function(x, y) {
        var tilePos = this.getTilePosition(x, y);
        var pos = [];
        pos.x = tilePos.x * me.game.currentLevel.tilewidth;
        pos.y = tilePos.y * me.game.currentLevel.tileheight;
        return pos;
    },
    // get tile position in pixels from row and col
    getTileCoord: function(x, y) {
        var pos = [];
        pos.x = x * me.game.currentLevel.tilewidth;
        pos.y = y * me.game.currentLevel.tileheight;
        return pos;
    },
    initLevel : function(){
         me.game.reset();
         me.levelDirector.loadLevel(getQueriedShip());
//         me.state.set(me.state.PLAY, GameScreen);
    },
};



var checkCollision = {
    RedScreen : [],
    RedIndex : 0,
    TileWidth : 0,
    TileHeight : 0,
    init : function(){
        this.TileWidth = me.game.currentLevel.tilewidth;
        this.TileHeight = me.game.currentLevel.tileheight;
    },
    printRedStyle : function(mX, mY, useTilePosition){
        if(useTilePosition) {
            var coor = jsApp.getTileCoord(mX, mY);
            mX = coor.x;
            mY = coor.y;
        }
        this.RedScreen[this.RedIndex] = new RedColorObject(mX, mY, {});
        me.game.add(this.RedScreen[this.RedIndex], this.RedScreen[this.RedIndex].zIndex);
        this.RedIndex ++;
    },
    removeRedStyle : function(){
        var i = 0;
        for(i = this.RedIndex; i > 0; i -- )
        {
            me.game.remove(this.RedScreen[i - 1]);
            delete this.RedScreen[i - 1];
        }
        this.RedIndex = 0;
    },
    /**/
    
    /* check and process collision of obj*/
    processCollision : function(CurObj){
        //TODO: Replace calls to processCollision(obj) for obj.processCollision()
        //and remove this function from "checkCollision" object.
        return true;
        return CurObj.processCollision();
    },
    
};
// jsApp
/* the in game stuff*/
var PlayScreen = me.ScreenObject.extend({
    iItemID : 0,
    init : function(){
        this.parent(true);
        this.cartel = "asdf";
    },
   onResetEvent: function()
    {
        this.parent(true);
        me.game.reset();
        // stuff to reset on state change
        me.levelDirector.loadLevel(getQueriedShip());
        window.TILE_SIZE =  me.game.currentLevel.tilewidth;
       window.WIDTH = me.game.currentLevel.width;
       window.HEIGHT = me.game.currentLevel.height;
        me.game.sort();
        me.input.bindKey(me.input.KEY.ESC,  "escape");
        me.input.registerMouseEvent('mousedown', me.game.viewport, this.mouseDown.bind(this));
        me.input.registerMouseEvent('mousemove', me.game.viewport, this.mouseMove.bind(this));
        me.input.registerMouseEvent('mouseup',   me.game.viewport, this.mouseUp.bind(this));
        me.video.getScreenCanvas().addEventListener("dblclick", this.mouseDbClick, false);
        
        checkCollision.init();
        MapMatrix.init();
        ui.init();
       window.ship = new Ship();
    },
    
    update : function(){
        this.addAsObject = true;
        if( me.input.isKeyPressed("escape") )
        {
            if((SelectObject && select_item != -1) || DeleteObject)
                onMouseClickItem();
        }
    },
    mouseDbClick : function(e) {
        var mouseTile = utils.toTileVector(me.input.mouse.pos);
        if(ui.mouseLockedOn) {//the mouse is involved in a specific object
            ui.mouseLockedOn.lockedMouseDbClick(mouseTile);//delegate handling to the object
            return;
        }
        
        me.game.sort();
        me.game.repaint();
        
    },
    mouseDown: function(e) {
        var mouseTile = utils.toTileVector(me.input.mouse.pos);
        if(ui.mouseLockedOn) {//the mouse is involved in a specific object
            ui.mouseLockedOn.lockedMouseDown(mouseTile);//delegate handling to the object
            return;
        }
    },
    mouseMove : function(e){
        var mouseTile = utils.toTileVector(me.input.mouse.pos);
        if(ui.mouseLockedOn) {//the mouse is involved in a specific object
            ui.mouseLockedOn.lockedMouseMove(mouseTile);//delegate handling to the object
            return;
        }
        if(!ui.chosen) return;
        
        
        ui.moveGhost(mouseTile.x, mouseTile.y);
        me.game.sort();
        me.game.repaint();
        
    },
    mouseUp : function(e){
        var mouseTile = utils.toTileVector(me.input.mouse.pos);
        if(ui.mouseLockedOn) {//the mouse is involved in a specific object
            ui.mouseLockedOn.lockedMouseUp(mouseTile);//delegate handling to the object
            return;
        }
        if(!ui.chosen) return;
        
        ship.buildAt(mouseTile.x, mouseTile.y, ui.chosen.type);

        me.game.sort();
        me.game.repaint();
        
    },
    /* ---
     action to perform when game is finished (state change)
     --- */
    onDestroyEvent: function() {
    }
});

function Ship() {
    this.buildings = new Array();
    this.buildAt = function(x, y, buildingType) {
        var self = this;
        var building = utils.makeItem(x, y, buildingType);
        var canBuild = building.canBuildAt(x, y);
        if(!canBuild) {
            var canBuildRotated = building.canBuildRotated(x, y);
            if (canBuildRotated) {
                building.rotated(true);
            }
        }
        if(canBuild || canBuildRotated) {
            building.x(x).y(y);
            //remove anything in its way
            utils.itemTiles(building, function(iX, iY) {
                self.removeAt(iX,iY);
            });
            this.buildings.push(building);
            me.game.add(building, building.zIndex);
            this.buildingsMap.update();
            ui.updateGreenSpots();
            building.onBuilt();
            me.game.sort();
            me.game.repaint();
        }
    };
    this.removeAt = function(x, y) {
        if(this.map()[y][x] == charMap.codes._cleared) return;
        var self = this;
        _.each(this.buildings, function(b) {
            if(b.occupies(x,y)) {
                self.remove(b, false);
            }
        });
        this.buildingsMap.update();
    };
    this.remove = function(item, updateBuildings) {
        if(updateBuildings === undefined) 
            updateBuildings = true;//updates by default
        var index = _.indexOf(this.buildings, item);
        this.buildings.splice(index, 1);
        me.game.remove(item);
        if(updateBuildings)
            this.buildingsMap.update();
    };
    this._map = null;
    this.map = function() {
        if(this.buildingsMap.changed || this.hullMap.changed || this._map == null) {
            this._map = this._getJointMap();
            this.buildingsMap.changed = false;
            this.hullMap.changed = false;
        }
        return this._map;
    };
    this.buildingsMap = {
        changed: true,
        _buildingsMap: null,
        update: function () {
            var self = this;
            self._buildingsMap = utils.getEmptyMatrix(WIDTH, HEIGHT, charMap.codes._cleared);
            _.each(ship.buildings, function (b) {
                utils.itemTiles(b, function(x,y) {
                    self._buildingsMap[y][x] = b;
                });
            });
            
            this.changed = true;
        },
        get : function () {
            if(this._buildingsMap === null) this.update();
            return this._buildingsMap;
        }
    },
    this.hullMap = {
        changed: true,
        _hullMap: null,
        update: function () {;
            this._hullMap = charMap.get();//todo: move the charMap logic to here
            this._changed = true;
        },
        get : function () {
            if(this._hullMap === null) this.update();
            return this._hullMap;
        }
    };
    //joins hullMap and buildingsMap
    this._getJointMap = function() {
        var self = this;
        var joint = utils.getEmptyMatrix(WIDTH, HEIGHT, charMap.codes._cleared);
        utils.levelTiles(function(x,y) {
            joint[y][x] = self.hullMap.get()[y][x];
            if(self.buildingsMap.get()[y][x] != charMap.codes._cleared)
                joint[y][x] = self.buildingsMap.get()[y][x];
        });
        return joint;
    };
    
}

/*Everything related to the graphics during the process of building */
var ui = {
   chosen: null,//the chosen object from the panel (an ItemObject)
   mouseLockedOn: null, //who the mouse actions pertain to. 
   ghostItems:{} ,//Items that exist for the sole purpose of...
                    // ...showing the position at which they will be built.
   
    init: function () {
      this.ghostItems = new Object();//Items to be used when choosing building location
      for(var name in items) {
          if(items[name].Constructor !== undefined) {
              var newItem = new items[name].Constructor(0, 0, {  }, 123);
              this.ghostItems[name] = newItem;
              this.hide(newItem);
              me.game.add(newItem, newItem.zIndex+1000);
          }
      }
        this.greenSpots = utils.getEmptyMatrix(WIDTH, HEIGHT, 0);
    },
   choose:function(name)
   {
       if(this.chosen) {
           if(this.chosen.type == name) return;
           this.hide(this.chosen);
       }
       this.chosen = this.ghostItems[name];
       if(!this.chosen) return;
       this.show(this.chosen);
       this.updateGreenSpots();
       
   },
    show:function (obj) {
        
    },
    hide:function (obj) {
        obj.x(-100).y(-100);
    },
   moveGhost: function(x,y) {
       this.chosen.x(x).y(y);
       //Rotate if it fits somewhere
       if(!this.chosen.rotated() && this.chosen.canBuildRotated(x,y))
           this.chosen.rotated(true);
       if(this.chosen.rotated() && this.chosen.canBuildAt(x,y)) 
           this.chosen.rotated(false);
       this.updateRed();
   },
   
   redScreen : [],
   redIndex : 0,
   printRed : function(x, y){
        this.redScreen[this.redIndex] = new RedColorObject(x, y, {});
        me.game.add(this.redScreen[this.redIndex], this.redScreen[this.redIndex].zIndex +1000);
        this.redIndex ++;
   },
   clearRed : function(){
        var i = 0;
        for(i = this.redIndex; i > 0; i -- )
        {
            me.game.remove(this.redScreen[i - 1]);
            delete this.redScreen[i - 1];
        }
        this.redIndex = 0;
    },
   updateRed: function() {
       this.clearRed();
        var self = this;
        utils.itemTiles(this.chosen, function(iX, iY) {
            if(self.greenSpots[iY][iX] == 0) self.printRed(iX, iY);
        });
   },
   //A matrix of 1 and 0. In 0 should be red overlay when trying to build
   greenSpots: null,
   updateGreenSpots: function () {
       var self = this;
       self.greenSpots = utils.getEmptyMatrix(WIDTH, HEIGHT, 0);
       utils.levelTiles(function(x, y) {
           var i, j;
           if(self.chosen.canBuildAt(x, y)) {
               for ( i = x; i < self.chosen.size[0] + x && i < WIDTH; i++) {
                    for ( j = y; j < self.chosen.size[1] + y && j < HEIGHT; j++) {
                        self.greenSpots[j][i] = 1;
                    }
                }
           }
           if(self.chosen.canBuildRotated(x, y)) {
               for ( i = x; i < self.chosen.size[1] + x && i < WIDTH; i++) {
                    for ( j = y; j < self.chosen.size[0] + y && j < HEIGHT; j++) {
                        self.greenSpots[j][i] = 1;
                    }
                }
           }
       });
   },
   drawingScreen: [],
   //draws arbitrary stuff
   draw: function (x,y,type) {
       var item = utils.makeItem(x, y, type);
       me.game.add(item, item.zIndex+ 1000);
       this.drawingScreen.push(item);
       me.game.sort();
       me.game.repaint();
       
   },
   clear: function () {
       _.each(this.drawingScreen, function(i) {
           me.game.remove(i);
       });
       this.drawingScreen = new Array();
       this.clearRed();
       
       me.game.sort();
       me.game.repaint();
   },
   //combines the ship map with the drawing screen
   mapAt: function(x,y){
       for (var i = 0; i < this.drawingScreen.length; i++) {
           if(this.drawingScreen[i].occupies(x,y))
               return this.drawingScreen[i];
       }
       var shipTile = null;
       if(ship.map()[y] !== undefined && ship.map()[y][x] !== undefined)
           shipTile = ship.map()[y][x];
       
       if(shipTile == charMap.codes._cleared && this.chosen && this.chosen.occupies(x,y))
           return this.chosen;
       return shipTile;
   }
   
};

var utils = {
    toTileVector: function(vector2D) {
        var v = new me.Vector2d();
        v.x = Math.floor(vector2D.x / me.game.currentLevel.tilewidth);
        v.y = Math.floor(vector2D.y / me.game.currentLevel.tileheight);
        return v;
    },
    //useful when wanting to do something at every coordinate of a matrix
    matrixTiles : function (width, height, callback) {//the callback must have x and y
        for (var x = 0; x < width; x++) {
            for (var y = 0; y < height; y++) {
                callback(x, y);
            }
        }
    },
    //useful when wanting to do something at every coordinate of the level
    levelTiles: function (callback) {//the callback must have x and y
        utils.matrixTiles(WIDTH, HEIGHT, callback);
    },
    //traverses every tile coordinate inside the level of an item
    itemTiles: function(item, callback) {//the callback must have x and y
        for (var x = item.x(); x < item.trueSize(0) + item.x() && x < WIDTH && x >=0; x++) {
                for (var y = item.y(); y < item.trueSize(1) + item.y() && y < HEIGHT && y >=0; y++) {
                    callback(x, y);
                }
            }
    },
    getEmptyMatrix: function (width, height, initialValue) {
            var matrix = new Array();
            for (var i = 0; i < height; i++) {
                matrix.push(new Array());
                for (var j = 0; j < width; j++) {
                    matrix[i].push(initialValue);
                }
            }
            return matrix;
        },
    makeItem: function (x,y,type) {
        var itemInfo = items[type];
        if(!itemInfo || itemInfo.Constructor === undefined) {
            console.error("No such item type '" + type + "' (utils.makeItem).");
            return null;
        }
       return new itemInfo.Constructor(x,y,{});
    }
};

//bootstrap :)
window.onReady(function() {
    jsApp.onload();
});
