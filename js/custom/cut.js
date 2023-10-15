'use strict';
window.ThreeBSP = (function() {

    var ThreeBSP,
        EPSILON = 1e-5,
        COPLANAR = 0,
        FRONT = 1,
        BACK = 2,
        SPANNING = 3;

    ThreeBSP = function( object ) {

        this.matrix = new THREE.Matrix4();

        this.create( object );

    };

    ThreeBSP.prototype.subtract = function( other_tree ) {
        var a = this.tree.clone(),
            b = other_tree.tree.clone();

        a.invert();
        a.clipTo( b );
        b.clipTo( a );
        b.invert();
        b.clipTo( a );
        b.invert();
        a.build( b.allPolygons() );
        a.invert();
        a = new ThreeBSP( a );
        a.matrix = this.matrix;
        return a;
    };
});