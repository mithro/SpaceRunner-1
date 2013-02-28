/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global module, asyncTest, test, ok, equal, notEqual, deepEqual, start, th,
me, utils, ui, Ship*/

module('entities/core.js');
test('ItemObject.trueSize()', function() {
    'use strict';
    var door = utils.makeItem('door');
    deepEqual(door.size, [2, 1]);
    deepEqual(door.trueSize(), [2, 1]);

    door.rotated(true);
    deepEqual(door.trueSize(), [1, 2]);
    equal(door.trueSize(0), 1);
    equal(door.trueSize(1), 2);
});

test('ItemObject onShip/offShip animations', function() {
    'use strict';
    var door = utils.makeItem('door');
    deepEqual(door.offShipAnimations, ['idle']);
    deepEqual(door.onShipAnimations, ['h_open_close', 'v_open_close']);
    ok(!door.onShip(), 'door is not on ship');
    ok(!door.rotated(), 'door is not rotated');

    door.onShip(true); //not really ;)
    ok(door.isCurrentAnimation('h_open_close'),
        "on ship it has 'h_open_close' animation");

    door.rotated(true);
    door.onShip(false);
    ok(door.isCurrentAnimation('idle'), 'door is rotated and off ship,' +
        " but since it doesn't have off ship rotated animation," +
        " it uses 'idle'");

});

module('entities/items.js');
test('engine proper placement', function() {
    'use strict';
    var level = new me.TMXTileMap('test'),
        ship;
    level.load();
    ship = new Ship(level);
    ok(ship.buildAt(th.shipPositions.engine.x, th.shipPositions.engine.y,
        'engine'), 'building succeeds');
});

test('engine invalid placement', function() {
    'use strict';
    var level = new me.TMXTileMap('test'),
        ship;
    level.load();
    ship = new Ship(level);
    ok(!ship.buildAt(th.shipPositions.free.x, th.shipPositions.free.y,
        'engine'), 'building fails');
});

test('weapon proper placement', function() {
    'use strict';
    var level = new me.TMXTileMap('test'),
        ship;
    level.load();
    ship = new Ship(level);
    ok(ship.buildAt(th.shipPositions.weapon.x, th.shipPositions.weapon.y,
        'weapon'), 'building succeeds');
});

test('weapon invalid placement', function() {
    'use strict';
    var level = new me.TMXTileMap('test'),
        ship;
    level.load();
    ship = new Ship(level);
    ok(!ship.buildAt(th.shipPositions.free.x, th.shipPositions.free.y,
        'weapon'), 'building fails');
});

test('Console placement', function() {
    'use strict';
    var x, y, level, ship;
    level = new me.TMXTileMap('test');
    level.load();
    ship = new Ship(level);
    x = th.shipPositions.free.x;
    y = th.shipPositions.free.y;

    ok(!ship.buildAt(x, y, 'console'),
        'Console building fails in the middle of nowhere');
    ok(ship.buildAt(x, y, 'power'), 'Power built');
    ok(ship.buildAt(x - 1, y, 'console'),
        'Console building succeeds next to power');
});

asyncTest('Wall building', function() {
    'use strict';

    var x = th.shipPositions.free.x,
        y = th.shipPositions.free.y;
    th.loadScreen(function() {
            me.state.change(me.state.BUILD, 'test');
        },
        function(screen) {
            screen.ship.buildAt(x, y, 'wall');
            ok(screen.mouseLockedOn, 'Mouse locked on something');
            equal(screen.mouseLockedOn.type, 'wall', 'Mouse locked on wall');

            th.mouseBegin(screen);
            th.setMouse(x + 2, y);
            screen.mouseMove();
            screen.mouseDown({
                which: me.input.mouse.LEFT
            });
            screen.mouseUp({
                which: me.input.mouse.LEFT
            });
            th.setMouse(x + 2, y + 2);
            screen.mouseMove();
            screen.mouseDbClick({
                which: me.input.mouse.LEFT
            });
            ok(!screen.mouseLockedOn, 'Mouse unlocked after double click');
            equal(screen.ship.mapAt(x, y).type, 'wall');
            equal(screen.ship.mapAt(x + 1, y).type, 'wall');
            equal(screen.ship.mapAt(x + 2, y).type, 'wall');
            equal(screen.ship.mapAt(x + 2, y + 1).type, 'wall');
            equal(screen.ship.mapAt(x + 2, y + 2).type, 'wall');

            th.mouseEnd();
            start();
        });
});

asyncTest('Wall building canceled by escape key', function() {
    'use strict';
    var x = th.shipPositions.free.x,
        y = th.shipPositions.free.y;
    th.loadScreen(function() {
        me.state.change(me.state.BUILD, 'test');
    }, function(screen) {
        screen.choose('wall');
        th.mouseBegin(screen);
        th.leftClick(x, y);
        equal(screen.mouseLockedOn.type, 'wall', 'Mouse locked on wall');

        th.leftClick(x + 2, y);
        th.leftClick(x + 2, y + 2);
        th.mouseEnd();
        //entire wall is seen on the screen...
        equal(screen.mapAt(x, y).type, 'wall', 'wall appears at x,y');
        equal(screen.mapAt(x + 1, y).type, 'wall');
        equal(screen.mapAt(x + 2, y).type, 'wall');
        equal(screen.mapAt(x + 2, y + 1).type, 'wall');
        equal(screen.mapAt(x + 2, y + 2).type, 'wall');
        //...but only the first one is built
        equal(screen.ship.mapAt(x, y).type, 'wall');
        notEqual(screen.ship.mapAt(x + 1, y).type, 'wall');
        notEqual(screen.ship.mapAt(x + 2, y).type, 'wall');
        notEqual(screen.ship.mapAt(x + 2, y + 1).type, 'wall');
        notEqual(screen.ship.mapAt(x + 2, y + 2).type, 'wall');

        me.input.triggerKeyEvent(me.input.KEY.ESC, true);
        screen.update();
        me.input.triggerKeyEvent(me.input.KEY.ESC, false);

        ok(!screen.mouseLockedOn,
            'Mouse no longer locked on wall after ESC key');
        //wall does no longer appear on the screen (except the cursor)
        equal(screen.mapAt(x, y).type, 'wall',
            'Cursor still appears on the screen');
        notEqual(screen.mapAt(x + 1, y).type, 'wall',
            'The rest of the wall is gone');
        notEqual(screen.mapAt(x + 2, y).type, 'wall');
        notEqual(screen.mapAt(x + 2, y + 1).type, 'wall');
        notEqual(screen.mapAt(x + 2, y + 2).type, 'wall');
        //the first wall has been removed
        notEqual(screen.ship.mapAt(x, y).type, 'wall');
        start();
    });
});

