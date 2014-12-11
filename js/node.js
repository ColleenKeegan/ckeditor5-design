'use strict';

var utils = require( './utils' );

function Node( op ) {
	this.op = op || null;
	this.document = null;
	this.parent = null;
	this.root = null;
}

// static props
Node.type = null;
Node.tags = [];
Node.attributes = [];
Node.isContent = false;

// static methods
Node.pickAttributes = function( dom, attributes ) {
	var result = {};

	attributes.forEach( function( attribute ) {
		result[ attribute ] = dom.getAttribute( attribute );
	} );

	return result;
};

Node.toOperation = function( dom ) {
	var attributes = utils.extend( {
		type: this.type
	}, this.pickAttributes( dom, this.attributes ) );

	return {
		insert: 1,
		attributes: attributes
	};
};

Node.toDom = function( operation, doc ) {
	var tags = this.tags;

	if ( tags.length === 1 ) {
		var dom = doc.createElement( tags[ 0 ] ),
			attributes = utils.pick( operation.attributes, this.attributes );

		Object.keys( attributes ).forEach( function( name ) {
			var value;

			if ( ( value = attributes[ name ] ) !== null ) {
				dom.setAttribute( name, value );
			}
		} );

		return dom;
	}

	throw new Error( 'Override toDom in a subclass' );
};

// prototype
Node.prototype = {
	isContent: function() {
		return this.constructor.isContent;
	},

	setDocument: function( doc ) {
		this.document = doc;
	},

	setParent: function( node ) {
		this.parent = this;
	},

	setRoot: function( node ) {
		this.root = node;
	}
};

module.exports = Node;