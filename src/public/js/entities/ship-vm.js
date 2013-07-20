/*
-*- coding: utf-8 -*-
* vim: set ts=4 sw=4 et sts=4 ai:
* Copyright 2013 MITHIS
* All rights reserved.
*/

/*global */

var ShipVM = Object.extend({
    itemVMs: [],
    unitVMs: [],
    /**
     *
     * @param shipModel {sh.Ship} the ship model.
     */
    init: function(shipModel) {
        'use strict';
        this.m = shipModel;
    },
    showInScreen: function() {
        'use strict';
        me.levelDirector.loadLevel(this.m.tmxName);
        me.game.add(this, 1);
    },
    /**
     * Updates melonJS objects for items to be drawn on the screen
     * according to the ship model.
     */
    update: function(){
        'use strict';
        this.updateVMs(this.m.built, this.itemVMs);
        this.updateVMs(this.m.units, this.unitVMs);
        return true;//true, to make MelonJS happy
    },
    updateVMs: function(models, vms) {
        'use strict';
        var i, v, hasVM, aux;
        for(i = 0; i < models.length; i++) {
            hasVM = false;
            for(v = i; v < vms.length; v++) {
                if(models[i] === vms[v].m) {
                    hasVM = true;
                    break;
                }
            }
            if (hasVM) {
                //put vm at item's index position
                if(v != i){
                    aux = vms[v];
                    vms[v] = vms[i];
                    vms[i] = aux;
                }
            }else {
                //new vm
                vms.splice(i, 0, make.vm(models[i]));
                me.game.add(vms[i], vms[i].zIndex);
            }
        }
        //remove extra vms
        for(v = models.length; v < vms.length; v++) {
            me.game.remove(vms[v], true);
        }
        vms.splice(models.length, vms.length - models.length);
    },
    draw: function(ctx) {
        'use strict';
        return true;
    },
    selected: function(){
        'use strict';
        return _.filter(this.unitVMs, function(u){
            return u.selected;
        });
    },
    getVM: function(model) {
        'use strict';
        var index;
        function getMatch(modelArray, vmArray){
            index = modelArray.indexOf(model);
            if(index !== null && typeof index !== 'undefined') {
                return vmArray[index];
            }
            throw 'Did not find view model, try calling update first.';
        }
        if(model instanceof sh.Item) {
            return getMatch(this.m.built, this.itemVMs);
        }else if(model instanceof sh.Unit){
            return getMatch(this.m.units, this.unitVMs);
        }else{
            throw 'Invalid type of model.';
        }
    }
});