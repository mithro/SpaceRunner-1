/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global me, html, jsApp, ko, _, GameScreen, screens */

screens.register('ship-select', GameScreen.extend({
    init: function(name) {
        'use strict';
        this.parent(name);
    },
    onReset: function() {
        'use strict';
        return 0;
    },
    onDestroy: function() {
        'use strict';
        return 0;
    },
    onHtmlLoaded: function() {
        'use strict';
        var RaceButtonSet, HtmlViewModel;
        RaceButtonSet = function(name, ships, selected) {
            this.name = name;
            this.ships = ships;
            this.selected = ko.observable(selected);
            this.img = function(shipType) {
                var race = this.name.toLowerCase();
                return 'data/img/render/ships/' + race + '/' + race + '_' +
                    shipType.toLowerCase() + '_img.png';
            };
        };
        HtmlViewModel = function(screen) {
            this.selectedRace = function() {
                var race = _.find(this.races, function(r) {
                    return r.selected();
                });
                if (!race) {
                    console.error('No race is selected');
                }
                return race.name;
            };
            this.selectRace = function(raceButtonSet) {
                _.each(screen.htmlVm.races, function(r) {
                    r.selected(raceButtonSet.name === r.name);
                });
            };
            this.selectShip = function(shipType) {
                var tmxName = screen.htmlVm.selectedRace() + '_' + shipType;
                me.state.change('ship-building', {tmxName: tmxName});
            };
            this.races = [
                new RaceButtonSet('Cyborg',
                    [
                        'Frigate',
                        'Cruiser',
                        'Battleship1',
                        'Drone'
                    ], true),
                new RaceButtonSet('Humanoid',
                    [
                        'Frigate',
                        'Cruiser',
                        'Battleship',
                        'Drone'
                    ]),
                new RaceButtonSet('Liquid',
                    [
                        'Frigate',
                        'Cruiser',
                        'Battleship',
                        'Drone'
                    ]),
                new RaceButtonSet('Mechanoid',
                    [
                        'Frigate',
                        'Cruiser',
                        'Battleship',
                        'Drone'
                    ])
            ];
        };
        this.htmlVm = new HtmlViewModel(this);
        ko.applyBindings(this.htmlVm,
            document.getElementById('screensUi'));
    }
}));
