'use strict';

var Node = require( './node' ),
	utils = require( './utils' );

function Branch( children ) {
	Node.apply( this, arguments );

	this.children = Array.isArray( children ) ? children : [];
}


// inherit statics
utils.extend( Branch, Node );
// inherit prototype
utils.inherit( Branch, Node );

utils.extend( Branch.prototype, {
	hasChildren: function() {
		return !!this.children.length;
	},

	getChildren: function() {
		return this.children;
	}
} );

module.exports = Branch;