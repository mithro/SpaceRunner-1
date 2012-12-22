﻿
// weapon object 
var iWeaponObject = ItemObject.extend({
    // init function
    init : function(x, y, settings, mID){
        this.size = [2, 2];
        this.mResource = items.weapon.index;
        this.mid = mID;
        this.charCode = items.weapon.code;
        this.parent(x, y, settings, this.mResource);
        
    },
    buildPlacementRules : function() {
        this.parent();
        this.placementRules.push(new pr.PlacementRule({tile:charMap.codes._front, 
                                                       inAny:[{ x: 2, y: 0 }, { x: 2, y: 1 }]}));
    }
    
});
// engine object 
var iEngineObject = ItemObject.extend({
    // init function
    init : function(x, y, settings, mID){
        this.mResource = items.engine.index;
        this.mid = mID;
        this.size = [2, 2];
        this.cannonTile = [1, 0];
        this.charCode = items.engine.code;
        this.parent(x, y, settings, this.mResource);
    },
    buildPlacementRules : function() {
        this.parent();
        this.placementRules.push(new pr.PlacementRule({tile:charMap.codes._back, 
                                                       inAll:[{ x: -1, y: 0 }, { x: -1, y: 1 }]}));
    }
    
});


// power object 
var iPowerObject = ItemObject.extend({
    // init function
    init : function(x, y, settings, mID){
        this.mResource = items.power.index;
        this.mid = mID;
        this.size = [2, 2];
        this.charCode = items.power.code;
        this.parent(x, y, settings, this.mResource);
    }
    
});

// console object class 
var iConsoleObject = ItemObject.extend({
    
    // init function
    init : function(x, y, settings, mID){
        this.mResource = items.console.index;
        this.mid = mID;
        this.size = [1, 1];
        this.charCode = items.console.code;
        this.parent(x, y, settings, this.mResource);
    },
    buildPlacementRules: function () {
        this.parent();
        this.placementRules.push(pr.make.nextToRule(function (tile) {
            return tile.type == "weapon" || tile.type == "engine" || tile.type == "power";
        }, this.size[0], this.size[1]));
    }
});

// component object class
var iComponentObject = ItemObject.extend({
    // init function
    init : function(x, y, settings, mID){
        this.mResource = items.component.index;
        this.mid = mID;
        this.size = [2, 2];
        //image sprite width / height
        settings.spritewidth = 64;
        settings.spriteheight = 64;
        this.charCode = items.component.code;
        this.parent(x, y, settings, this.mResource);
        // add animation
        this.addAnimation ("idle", [3]);
        this.addAnimation ("charge", [0, 1, 2, 3, 4, 5, 5]);
        // set animation
        this.setCurrentAnimation("idle");
        this.animationspeed = 15;
    },
    onMouseDown : function() {
        if(select_item == -1)
        {
            this.parent();
            this.setCurrentAnimation("idle");
        }
    },
    onMouseUp : function(){
        if(this.isDrag == true)
        {
            this.parent();
            this.setCurrentAnimation("charge");
        }
    },
    setWalkable : function(){
            MapMatrix.setWalkable(this.pos.x, this.pos.y, this.width, this.height);
    },
    setUnWalkable : function(){
        MapMatrix.setUnWalkable(this.pos.x, this.pos.y, this.width, this.height);
    },
});
// door object class 
var iDoorObject = ItemObject.extend({
    // init function
    init : function(x, y, settings, mID){
        this.mResource = items.door.index;
        this.mid = 110;
        //image sprite width / height
        settings.spritewidth = 64;
        settings.spriteheight = 32;
        this.charCode = items.door.code;
        this.size = [2, 1];
        this.parent(x, y, settings, this.mResource);
        // add animation
        this.addAnimation ("idle",  [2]);
//        this.addAnimation ("v_open_close",  [10]);
        this.addAnimation ("v_open_close",  [0, 2, 4, 6, 8, 10, 10, 8, 6, 4, 2, 0]);
        this.addAnimation ("h_open_close",  [1, 3, 5, 7, 9, 11, 11, 9, 7, 5, 3, 1]);
        this.angle = 0;
        // set animation
        this.setCurrentAnimation("idle");
        this.animationspeed = 10;
        //this.rotated(true);
        this.mfix = false;
        window.changed = 0;
    }
    ,
    /* remove wall */
    removeWallinCollision : function() {
        var mRes = null;
        var mTemp = null;
        var mWallGroup = null;
        while(1){
            if(this.rotateFlag)
            {
                this.updateColRect(17, this.height - 1, -15, this.width - 1);
                mRes = me.game.collide(this);
                if(!mRes || mRes.obj.mResource != 9)
                    break;
            }
            else{
                this.updateColRect(1, this.width - 2, 1, this.height - 2);
                mRes = me.game.collide(this);
                if(!mRes || mRes.obj.mResource != 9)
                    break;
            }
            mWallGroup = ObjectsMng.searchWallGroupfromWall(mRes.obj);
            if(mWallGroup)
            {
                mWallGroup.removeWallObject(mRes.obj);
            }
        }
        if(mWallGroup)
            mWallGroup.addOtherObject(this);
        this.updateColRect(0, this.width, 0, this.height);
    },
    buildPlacementRules: function () {
        //doesn't use inherited placementRules
        this.placementRules = [pr.make.spaceRule(function (tile) {
                                                     return _.isFunction(tile.isCurrentAnimation) 
                                                         && tile.isCurrentAnimation("lrWall");
                                                }, 2, 1)];
        this.rotatedPlacementRules = [pr.make.spaceRule(function (tile) {
                                                     return _.isFunction(tile.isCurrentAnimation)
                                                         && tile.isCurrentAnimation("tbWall");
                                                }, 1, 2)];
    },
    canBuildRotated: function(x,y){
        return _.every(this.rotatedPlacementRules, function(r) {
            return r.compliesAt(x, y, ship.map());
        });
    }
    
    
//    update : function(){
//        this.processRotate();
//    },
});
// wall object class
var iWallObject = ItemObject.extend({
    // init function
    init : function(x, y, settings, mID){
        this.mResource = items.wall.index;
        this.mid = mID;
        //image sprite width / height
        settings.spritewidth = 32;
        settings.spriteheight = 32;
        
        this.size = [1, 1];
        this.charCode = items.wall.code;
        this.parent(x, y, settings, this.mResource);
        // add animation
        // add animation
        //Wall connects: t=top, l=left, b=bottom, r=right
        this.addAnimation ("lrWall", [0]);
        this.addAnimation ("tbWall", [1]);
        this.addAnimation ("trWall", [2]);
        this.addAnimation ("tlrWall", [3]);
        this.addAnimation ("tlbrWall", [4]);
        this.addAnimation ("tlWall", [5]);
        this.addAnimation ("brWall", [6]);
        this.addAnimation ("lbrWall", [7]);
        this.addAnimation ("lbWall", [8]);
        this.addAnimation ("tlbWall", [9]);
        this.addAnimation ("tbrWall", [10]);
        // set animation
        this.setCurrentAnimation("lrWall");
        this.animationspeed = 6;
        me.input.registerMouseEvent("mousedown", this, this.onMouseDown.bind(this));
        me.input.registerMouseEvent("mouseup", this, this.onMouseUp.bind(this));
    },
    onMouseDown : function() {
        if(select_item == -1)
        {
            SelectObject = ObjectsMng.searchWallGroupfromWall(this);
            if(SelectObject)
            {
                this.isDrag = true;
                select_item = 101;
                isDragable = true;
                SelectObject.setPrePostoCurPos();
                SelectObject.WallPosX = this.pos.x;
                SelectObject.WallPosY = this.pos.y;
                SelectObject.setWalkable();
                displayMoveCursor();
            }
        }
    },
    onMouseUp : function(){
        if(this.isDrag == true)
        {
            if(SelectObject)
            {
                DeleteObject = SelectObject;
                if(SelectObject.checkCollissionGroup())
                {
                    checkCollision.removeRedStyle();
                    SelectObject.setCurPostoPrePos();
                }
                SelectObject.setUnWalkable();
                SelectObject = null;
            }
            this.isDrag = false;
            select_item = -1;
            isDragable = false;
            displayDefaultCursor();
       }
    },
    updateAnimation : function()
    {
        if(window.ship === undefined) return;
        var wallsAround = [];
        var x = this._x;
        var y = this._y;
        var map = ship.map();
        if(map[y-1] !== undefined && map[y-1][x] !== undefined && map[y-1][x].type == "wall")
            wallsAround.push("t");//top
        if(map[y] !== undefined && map[y][x-1] !== undefined && map[y][x-1].type == "wall")
            wallsAround.push("l");//left
        if(map[y+1] !== undefined && map[y+1][x] !== undefined && map[y+1][x].type == "wall")
            wallsAround.push("b");//bottom
        if(map[y] !== undefined && map[y][x+1] !== undefined && map[y][x+1].type == "wall")
            wallsAround.push("r");//right
        if(wallsAround.length == 0) {
            this.setCurrentAnimation("lrWall");//default
            return;
        }
        if(wallsAround.length == 1) {//just one connection
            if(wallsAround[0] == "t" || wallsAround[0] == "b") {
                this.setCurrentAnimation("tbWall");
                return;
            }
            if(wallsAround[0] == "l" || wallsAround[0] == "r") {
                this.setCurrentAnimation("lrWall");
                return;
            }
        }
        wallsAround.push("Wall");
        var animationName = wallsAround.join("");
        this.setCurrentAnimation(animationName);
    },
    removeObject : function(){
        me.game.remove(this);
        delete this;
    },
    update : function(){
        this.updateAnimation();
    },
    onPositionChange:function () {
        this.parent();
        //this.updateAnimation();
    }
});

var WallGroupObject = ItemObject.extend({
    mWallObject : [],
    mStarti : 0,
    WallPosX : 0,
    WallPosY : 0,
    init : function(mID){
        this.mid = mID;
        this.mResource = 101;
        this.WallPosX = 0;
        this.WallPosY = 0;
        this.mStarti = 0;
        this.mWallObject = [];
    },
    addOtherObject : function(Obj){
        if(Obj)
            this.mWallObject[this.mWallObject.length] = Obj;
    },
    addWallObject : function(x, y){
        var wallObj = new iWallObject(x, y, {}, this.mid);
        me.game.add(wallObj, 102);
        this.mWallObject[this.mWallObject.length] = wallObj;
        return wallObj;
    },
    removeWallObject : function(Obj){
        if(Obj && this.mid == Obj.mid)
        {
            me.game.remove(Obj);
            this.mWallObject.remove(Obj);
            return true;
        }
        return false;
    },
    removeAll : function(eIndex) {
        var i = 0;
        var Obj = null;
        
        for( i = this.mWallObject.length - 1; i >= eIndex; i -- )
        {
            Obj = this.mWallObject[i];
            me.game.remove(Obj);
            this.mWallObject.remove(Obj);
        }
    },
    removeUnFixedObject : function() {
        var i = 0;
        var Obj = null;
        for( i = this.mWallObject.length - 1; i >= 0; i -- )
        {
            Obj = this.mWallObject[i];
            
            if(Obj.mfix == true)
                break;
            me.game.remove(Obj);
            this.mWallObject.remove(Obj);
        }
        return i;
    },
    getFirstWallObject : function(){
        return this.mWallObject[0];
    },
    process : function(dragflag, mPos){
        if(!dragflag)
        {
            this.mWallObject[0].pos.x = mPos.x;
            this.mWallObject[0].pos.y = mPos.y;
            checkCollision.processCollision(this.mWallObject[0]);
        }
        else{
            if(this.mWallObject[0].mfix != true)
                this.mWallObject[0].mfix = true;
            this.mStarti = this.removeUnFixedObject();
            this.drawWall(mPos);
        }
    },
    drawWall : function(mPos){
        var startX = this.mWallObject[this.mStarti].pos.x / checkCollision.TileWidth;
        var startY = this.mWallObject[this.mStarti].pos.y / checkCollision.TileHeight;
        var endX = mPos.x / checkCollision.TileWidth;
        var endY = mPos.y / checkCollision.TileHeight;
        var finder = new PF.BestFirstFinder();
        var cloneGrid = MapMatrix.MapGrid.clone();
        var path = finder.findPath(startX, startY, endX, endY, cloneGrid);
        var i = 0;
        for(i = 1; i < path.length; i ++)
            this.addWallObject(path[i][0] * checkCollision.TileWidth, path[i][1] * checkCollision.TileHeight);
    },
    setFixFlag : function(){
        var mIndex = 0;
        for(mIndex = 0; mIndex < this.mWallObject.length; mIndex ++)
        {
            this.mWallObject[mIndex].mfix = true;
            MapMatrix.setUnWalkable(this.mWallObject[mIndex].pos.x, this.mWallObject[mIndex].pos.y, this.mWallObject[mIndex].width, this.mWallObject[mIndex].height);
        }
    },
    setWalkable : function(){
        var mIndex = 0;
        for(mIndex = 0; mIndex < this.mWallObject.length; mIndex ++)
        {
            if(this.mWallObject[mIndex].mResource == 8)
                MapMatrix.setWalkable(this.mWallObject[mIndex].pos.x, this.mWallObject[mIndex].pos.y, this.mWallObject[mIndex].width, this.mWallObject[mIndex].height * 2);
            else
                MapMatrix.setWalkable(this.mWallObject[mIndex].pos.x, this.mWallObject[mIndex].pos.y, this.mWallObject[mIndex].width, this.mWallObject[mIndex].height);
        }
    },
    setUnWalkable : function(){
        var mIndex = 0;
        for(mIndex = 0; mIndex < this.mWallObject.length; mIndex ++)
        {
            if(this.mWallObject[mIndex].mResource == 8)
                MapMatrix.setUnWalkable(this.mWallObject[mIndex].pos.x, this.mWallObject[mIndex].pos.y, this.mWallObject[mIndex].width, this.mWallObject[mIndex].height * 2);
            else
                MapMatrix.setUnWalkable(this.mWallObject[mIndex].pos.x, this.mWallObject[mIndex].pos.y, this.mWallObject[mIndex].width, this.mWallObject[mIndex].height);
        }
    },
    movePorcess : function(mX, mY){
        var dtX = mX - this.WallPosX;
        var dtY = mY - this.WallPosY;
        this.WallPosX = mX;
        this.WallPosY = mY;
        var i = 0;
        checkCollision.removeRedStyle();
        for(i = 0; i < this.mWallObject.length; i ++)
        {
            this.mWallObject[i].pos.x += dtX;
            this.mWallObject[i].pos.y += dtY;
            
            this.checkCollission(this.mWallObject[i]);
        }
    },
    checkCollissionGroup : function(){
        var mRet = false;
        var i = 0;
        for(i = 0; i < this.mWallObject.length; i ++)
        {
            if(this.checkCollission(this.mWallObject[i]))
            {
                mRet = true;
                break;
            }
        }
        return mRet;
    },
    checkCollission : function(Obj){
        var mRet = true;
        var mTemp1 = checkCollision.checkObjectCollision(Obj);
        var mTemp2 = checkCollision.checkOutlineCollision(Obj);
        if( mTemp1 && mTemp2)
            mRet = false;
        return mRet;
    },
    setPrePostoCurPos : function(){
        for(i = 0; i < this.mWallObject.length; i ++)
        {
            this.mWallObject[i].preX = this.mWallObject[i].pos.x;
            this.mWallObject[i].preY = this.mWallObject[i].pos.y;
        }
    },
    setCurPostoPrePos : function(){
        for(i = 0; i < this.mWallObject.length; i ++)
        {
            this.mWallObject[i].pos.x = this.mWallObject[i].preX;
            this.mWallObject[i].pos.y = this.mWallObject[i].preY;
        }
    },
});
var makeJsonString = {
    /*
    JsonString = {
        'Objects' : [
            {'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234},
            {'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234, 'Setting' : 'wewer'},
            {'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234, 'Setting' : 'wewer'},
            {'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234, 'Setting' : 'wewer'},
            {'Resource' : 101, Walls : [{'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234}, {'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234},{...}]},
            {'Resource' : 101, Walls : [{'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234}, {'Resource' : 1, 'id' : 3, 'PosX' : 123, 'PosY' : 234},{...}]},
        ],
    }
    */
    JsonString : "",
    init : function(){
        this.JsonString = "";
    },
    setFirstString : function(){
        this.JsonString = '{"Objects" : [';
    },
    makeObjecttoString : function(curObj, firstItem){
        var i = 0;
        var subObj = null;
        var subfirst = true;
        if(curObj)
        {
            if(!firstItem)
                this.JsonString += ',';
            this.JsonString += '{"Resource":' + curObj.mResource;
            this.JsonString += ',"id":' + curObj.mid;
            if(curObj.mResource == 101)
            {
                this.JsonString += ',"Walls":[';
                for(i = 0; i < curObj.mWallObject.length; i ++)
                {
                    subObj = curObj.mWallObject[i];
                    if(subObj)
                    {
                        this.makeObjecttoString(subObj, subfirst);
                        if(subfirst == true)
                            subfirst = false;
                    }
                }
                this.setEndString();
            }
            else{
                this.JsonString += ',"PosX":' + curObj.pos.x;
                this.JsonString += ',"PosY":' + curObj.pos.y;
                this.JsonString += ',"Fix":' + curObj.mfix;
                this.JsonString += ',"angle":' + curObj.angle;
                this.JsonString += ',"animation":"' + curObj.current.name;
                this.JsonString += '"}';
            }
        }
    },
    setEndString : function(){
        this.JsonString += ']}';
    },
    makeString : function(){
        var mX = 0;
        var mY = 0;
        var TempObject = new ItemObject(0, 0, {}, 9);
        var firstFlag = true;
        var tempPos = new me.Vector2d(0, 0);
        var res = null;
        this.init();
        this.setFirstString();
        me.game.add(TempObject, 1);
        TempObject.updateColRect(1, checkCollision.TileWidth -2, 1, checkCollision.TileHeight - 2);
        for(mX = 0; mX < g_resources_size[1].width; mX += checkCollision.TileWidth)
        {
            for(mY = 0; mY < g_resources_size[1].height; mY += checkCollision.TileHeight)
            {
                TempObject.pos.x = mX;
                TempObject.pos.y = mY;
                res = me.game.collide(TempObject);
                if(res)
                {
                    tempPos.x = res.obj.pos.x;
                    tempPos.y = res.obj.pos.y;
                    if(res.obj.mResource != 8 && res.obj.mResource != 9)
                    {
                        if(TempObject.containsPoint(tempPos) && res.obj.mfix)
                        {
                            this.makeObjecttoString(res.obj, firstFlag);
                            if(firstFlag == true)
                                firstFlag = false;
                        }
                    }
                }
            }
        }
        var i = 0;
        for(i = 0; i < ObjectsMng.Objects.length; i ++)
        {
            res = ObjectsMng.Objects[i];
            if(res)
            {
                this.makeObjecttoString(res, firstFlag);
                if(firstFlag == true)
                    firstFlag = false;
            }
        }
        this.setEndString();
        me.game.remove(TempObject);
        delete TempObject;
        delete tempPos;
        return this.JsonString;
    },
    
};