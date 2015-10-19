'use strict';

// Implementation of http://www.collide.info/Lehre/SeminarWS0405/DavisSunLu02.pdf with own modifications.

// Some global constants.
var SAME = 1,
	PREFIX = 0,
	DIFFERENT = -1;

class Node {
	constructor() {
		this.attrs = {};
		this.parent = null;
	}

	changeAttr( attr, value ) {
		if ( value ) {
			this.attrs[ attr ] = value;
		} else {
			delete this.attrs[ attr ];
		}
	}

	getAttrValue( attr ) {
		return typeof this.attrs[ attr ] == 'undefined' ? null : this.attrs[ attr ];
	}

	setParent( parent ) {
		this.parent = parent;
	}

	removeParent() {
		this.parent = null;
	}
}


class BlockNode extends Node {
	constructor( type ) {
		super();

		this.type = type;
		this.children = [];
	}

	addChild( offset, node ) {
		node.setParent( this );
		this.children.splice( offset, 0, node );
	}

	removeChild( offset ) {
		var removedNode = this.children.splice( offset, 1 )[ 0 ];
		removedNode.removeParent();

		return removedNode;
	}

	getChild( offset ) {
		return this.children[ offset ];
	}

	getChildCount() {
		return this.children.length;
	}
}

class TextNode extends Node {
	constructor( char ) {
		super();

		this.char = char;
	}
}

// Compares two addresses.
function compare( a, b ) {
	if ( a.root != b.root ) {
		// Completely different tree.
		return DIFFERENT;
	}

	for ( var i = 0; i < a.path.length; i++ ) {
		if ( i == b.path.length ) {
			// All nodes were same for whole B address,
			// so B address is a prefix of A address.
			return PREFIX;
		} else if ( a.path[ i ] != b.path[ i ] ) {
			// At one point the addresses diverge,
			// so they are different and won't affect each other.
			return DIFFERENT;
		}
	}

	if ( a.path.length == b.path.length ) {
		// Both addresses were same at all points.
		// If their length is also same, we have the same address.
		return SAME;
	}

	// If addresses have different length, B is a suffix of A,
	// and won't affect it. Suffixes work like different addresses.
	return DIFFERENT;
}

// Gets the node that is under specified address.
function getNode( address ) {
	var node = address.root;

	for ( var i = 0; i < address.path.length; i++ ) {
		node = node.getChild( address.path[ i ] );

		if ( !node ) {
			return null;
		}
	}

	return node;
}

function createOperation( type, props ) {
	var op = {
		type: type,
		id: createOperation.ID++
	};

	for ( var i in props ) {
		if ( props.hasOwnProperty( i ) ) {
			op[ i ] = props[ i ];
		}
	}

	return op;
}

createOperation.ID = 0;

function createAddress( root, path ) {
	return {
		root: root,
		path: path
	};
}

function copyAddress( address ) {
	return createAddress( address.root, address.path.slice() );
}

function copyOperation( op ) {
	var type = op.type;
	var params = {};

	for ( var i in op ) {
		if ( op.hasOwnProperty( i ) ) {
			params[ i ] = op[ i ];
		}
	}

	if ( op.address ) {
		params.address = copyAddress( op.address );
	}
	if ( op.fromAddress ) {
		params.fromAddress = copyAddress( op.fromAddress );
	}
	if ( op.toAddress ) {
		params.toAddress = copyAddress( op.toAddress );
	}

	return createOperation( type, op );
}

function applyOperation( op ) {
	var params = [];

	for ( var i in op ) {
		if ( op.hasOwnProperty( i ) && i != 'type' && i != 'id' ) {
			params.push( op[ i ] );
		}
	}

	return OP[ op.type ].apply( this, params );
}

function getNoOp( a ) {
	var address;

	switch ( a.type ) {
		case 'move':
			address = copyAddress( a.fromAddress );
			address.path.push( a.fromOffset );
			break;

		case 'change':
		case 'noop':
			address = copyAddress( a.address );
			break;

		default:
			address = copyAddress( a.address );
			address.path.push( a.offset );
			break;
	}

	return createOperation( 'noop', {
		address: address
	} );
}

var OP = {
	insert: function( address, offset, node ) {
		if ( node.parent !== null ) {
			throw Error( 'Trying to insert a node that is already inserted.' );
		}

		var parent = getNode( address );
		parent.addChild( offset, node );

		return node;
	},
	remove: function( address, offset ) {
		var parent = getNode( address );
		return parent.removeChild( offset );
	},
	change: function( address, attr, value ) {
		var node = getNode( address );
		node.changeAttr( attr, value );

		return node;
	},
	move: function( fromAddress, fromOffset, toAddress, toOffset ) {
		var destinationNode = getNode( toAddress );
		var movedNode = getNode( fromAddress ).getChild( fromOffset );

		var node = destinationNode;
		while ( node != null ) {
			if ( node == movedNode ) {
				throw Error( 'Trying to move a node into itself or it\'s descendant.' );
			}

			node = node.parent;
		}

		var originNode = movedNode.parent;

		originNode.removeChild( fromOffset );

		if ( originNode == destinationNode && fromOffset < toOffset ) {
			toOffset--;
		}

		destinationNode.addChild( toOffset, movedNode );

		return movedNode;
	},
	noop: function( address ) {
		return getNode( address );
	}
};

function transform( a, b ) {
	return IT[ a.type ][ b.type ]( a, b );
}

var IT = {
	insert: {
		// IT(insert(Na, na, Ma, Ta), insert(Nb, nb, Mb, Tb))
		insert: function( a, b ) {
			a = copyOperation( a );

			// if (<Na> = Mb)
			if ( a.address.root == b.node ) {
				if ( b.address.root == a.node ) {
					// This means that we are inserting nodes into each other.
					// We will revert site operation.

					return createOperation( 'remove', {
						address: copyAddress( b.address ),
						offset: b.offset,
						node: b.node,
						site: a.site
					} );
				}

				// N'a <- (<Nb>, Nb[:] + [nb] + Na[:])
				a.address = createAddress( b.address.root, b.address.path.concat( b.offset, a.address.path ) );

				// elif (compare(Na, Nb) = PREFIX(i))
			} else if ( compare( a.address, b.address ) == PREFIX ) {
				var i = b.address.path.length;

				// if (nb <= Na[i])
				if ( b.offset <= a.address.path[ i ] ) {
					// N'a[i] <- Na[i] + 1
					a.address.path[ i ]++;
				}

				// elif (compare(Na, Nb) = SAME)
			} else if ( compare( a.address, b.address ) == SAME ) {
				// if (nb < na) or (nb = na and site(Na) < site(Nb))
				if ( b.offset < a.offset || ( b.offset == a.offset && a.site < b.site ) ) {
					// n'a <- na + 1
					a.offset++;
				}
			}

			// return insert(N'a, n'a, Ma, Ta)
			return a;
		},

		// IT(insert(Na, na, Ma, T), delete(Nb, nb, Mb))
		remove: function( a, b ) {
			a = copyOperation( a );

			// if (compare(Na, Nb) = SAME)
			if ( compare( a.address, b.address ) == SAME ) {
				// if (nb < na)
				if ( b.offset < a.offset ) {
					// n'a <- n'a ? 1
					a.offset--;
				}

				// elif (compare(Na, Nb) = PREFIX(i))
			} else if ( compare( a.address, b.address ) == PREFIX ) {
				var i = b.address.path.length;

				// if (nb < Na[i])
				if ( b.offset < a.address.path[ i ] ) {
					// N'a[i] <- Na[i] - 1
					a.address.path[ i ]--;
				}

				// elif (nb = Na[i])
				else if ( b.offset == a.address.path[ i ] ) {
					// N'a <- (Mb, Na[i + 1 :])
					a.address = createAddress( b.node, a.address.path.slice( i + 1 ) );
				}
			}

			// return insert(N'a, n'a, Ma, T)
			return a;
		},

		// IT(insert(Na, n, M, T), change(Nb, k, f))
		change: copyOperation,

		// IT(insert(Na, n, M, T), move(Nb1, nb1, Nb2, nb2))
		move: function( a, b ) {
			a = copyOperation( a );

			var b1 = createOperation( 'remove', {
				address: copyAddress( b.fromAddress ),
				offset: b.fromOffset,
				node: b.node,
				site: b.site
			} );

			var b2 = createOperation( 'insert', {
				address: copyAddress( b.toAddress ),
				offset: b.toOffset,
				node: b.node,
				site: b.site
			} );
			b2 = transform( b2, b1 );

			var a1 = transform( a, b1 );
			a1 = transform( a1, b2 );

			return a1;
		},
		noop: copyOperation
	},
	remove: {
		// IT(delete(Na, na, Ma), insert(Nb, nb, Mb, Tb))
		insert: function( a, b ) {
			a = copyOperation( a );

			if ( a.address.root == b.node ) {
				// N'a <- (<Nb>, Nb[:] + [nb] + Na[:])
				a.address = createAddress( b.address.root, b.address.path.concat( b.offset, a.address.path ) );
			}

			// elif (compare(Na, Nb) = PREFIX(i))
			else if ( compare( a.address, b.address ) == PREFIX ) {
				var i = b.address.path.length;

				// if (n < Na[i]) or (n = Na[i] and site(Na) < site(Nb))
				if ( b.offset <= a.address.path[ i ] ) {
					// N'a[i] <- Na[i] + 1
					a.address.path[ i ]++;
				}
			}

			// elif (compare(Na, Nb) = SAME)
			else if ( compare( a.address, b.address ) == SAME ) {
				// if (nb < na)
				if ( b.offset <= a.offset ) {
					// n'a <- na + 1
					a.offset++;
				}
			}

			// return delete(N'a, n'a, Ma)
			return a;
		},

		// IT(delete(Na, na, Ma), delete(Nb, nb, Mb))
		remove: function( a, b ) {
			a = copyOperation( a );

			// if (compare(Na, Nb) = SAME)
			if ( compare( a.address, b.address ) == SAME ) {
				// if (nb < na)
				if ( b.offset < a.offset ) {
					// n'a <- na ? 1
					a.offset--;
				}

				// elif (nb = na) and (site(Na) = site(Nb))
				// ** modified - removed site condition, which just doesn't seem to be right (and gives bad results)
				// ** this is removing the same element, so each time when this happens, the incoming operation should be skipped
				else if ( b.offset == a.offset ) {
					//return change(Na, children, identity)
					return getNoOp( a );
				}
			}

			// elif (compare(Na, Nb) = PREFIX(i))
			else if ( compare( a.address, b.address ) == PREFIX ) {
				var i = b.address.path.length;

				// if (nb < Na[i])
				if ( b.offset < a.address.path[ i ] ) {
					// N'a[i] <- Na[i] ? 1
					a.address.path[ i ]--;

					// elif (nb = Na[i])
				} else if ( b.offset == a.address.path[ i ] ) {
					// N'a <- (Mb, Na[i + 1 :])
					a.address = createAddress( b.node, a.address.path.slice( i + 1 ) );
				}
			}

			// return delete(N'a, n'a, Ma)
			return a;
		},

		// IT(delete(Na, n, M), change(Nb, k, f))
		change: copyOperation,

		move: function( a, b ) {
			a = copyOperation( a );

			var b1 = createOperation( 'remove', {
				address: copyAddress( b.fromAddress ),
				offset: b.fromOffset,
				node: b.node,
				site: b.site
			} );

			var b2 = createOperation( 'insert', {
				address: copyAddress( b.toAddress ),
				offset: b.toOffset,
				node: b.node,
				site: b.site
			} );
			b2 = transform( b2, b1 );

			var a1 = transform( a, b1 );
			a1 = transform( a1, b2 );

			return a1;
		},
		noop: copyOperation
	},
	change: {
		// IT(change(Na, k, f), insert(Nb, n, M, T))
		insert: function( a, b ) {
			a = copyOperation( a );

			// if (<Na> = M)
			if ( a.address.root == b.node ) {
				// N'a <- (<Nb>, Nb[:] + [n] + Na[:])
				a.address = createAddress( b.address.root, b.address.path.concat( b.offset, a.address.path ) );
			}

			// elif (compare(Na, Nb) = PREFIX(i)) and (n <= Na[i])
			else if ( compare( a.address, b.address ) == PREFIX ) {
				var i = b.address.path.length;

				if ( b.offset <= a.address.path[ i ] ) {
					// N'a[i] <- Na[i] + 1
					a.address.path[ i ]++;
				}
			}

			// return change(N'a, k, f)
			return a;
		},

		// IT(change(Na, k, f), delete(Nb, n, M))
		remove: function( a, b ) {
			a = copyOperation( a );

			// if (compare(Na, Nb) = PREFIX(i))
			if ( compare( a.address, b.address ) == PREFIX ) {
				var i = b.address.path.length;

				// if (n < Na[i])
				if ( b.offset < a.address.path[ i ] ) {
					// N'a[i] <- N'a[i] ? 1
					a.address.path[ i ]--;

				// elif (n = Na[i])
				} else if ( b.offset == a.address.path[ i ] ) {
					// N'a <- (M, Na[i + 1 :])
					a.address = createAddress( b.node, a.address.path.slice( i + 1 ) );
				}
			}

			// return change(N'a, k, f)
			return a;
		},
		change: function( a, b ) {
			a = copyOperation( a );

			// If we change same node and same attr, one of operations have to get on top of the another.
			// So if this happens and a.site < b.site, we skip this operation.
			if ( compare( a.address, b.address ) == SAME && a.attr == b.attr && a.site < b.site ) {
				return getNoOp( a );
			}

			return a;
		},
		move: function( a, b ) {
			a = copyOperation( a );

			var b1 = createOperation( 'remove', {
				address: copyAddress( b.fromAddress ),
				offset: b.fromOffset,
				node: b.node,
				site: b.site
			} );

			var b2 = createOperation( 'insert', {
				address: copyAddress( b.toAddress ),
				offset: b.toOffset,
				node: b.node,
				site: b.site
			} );
			b2 = transform( b2, b1 );

			var a1 = transform( a, b1 );
			a1 = transform( a1, b2 );

			return a1;
		},
		noop: copyOperation
	},
	move: {
		// IT(move(Na1, na1, Na2, na2), insert(Nb, nb, M, T))
		insert: function( a, b ) {
			var a1 = createOperation( 'remove', {
				address: copyAddress( a.fromAddress ),
				offset: a.fromOffset,
				node: null,
				site: a.site
			} );

			var a2 = createOperation( 'insert', {
				address: copyAddress( a.toAddress ),
				offset: a.toOffset,
				node: null,
				site: a.site
			} );

			a1 = transform( a1, b );
			a2 = transform( a2, b );

			return createOperation( 'move', {
				fromAddress: a1.address,
				fromOffset: a1.offset,
				toAddress: a2.address,
				toOffset: a2.offset,
				node: null,
				site: a.site
			} );
		},

		// IT(move(Na1, na1, Na2, na2), delete(Nb, nb, M))
		remove: function( a, b ) {
			var a1 = createOperation( 'remove', {
				address: copyAddress( a.fromAddress ),
				offset: a.fromOffset,
				node: null,
				site: a.site
			} );

			var a2 = createOperation( 'insert', {
				address: copyAddress( a.toAddress ),
				offset: a.toOffset,
				node: null,
				site: a.site
			} );

			a1 = transform( a1, b );

			if ( a1.type == 'noop' ) {
				a2.node = b.node;
				return transform( a2, b );
			}

			a2 = transform( a2, b );

			return createOperation( 'move', {
				fromAddress: a1.address,
				fromOffset: a1.offset,
				toAddress: a2.address,
				toOffset: a2.offset,
				node: null,
				site: a.site
			} );
		},

		change: copyOperation,

		move: function( a, b ) {
			a = copyOperation( a );

			// Both operations try to move the same node.
			if ( compare( a.fromAddress, b.fromAddress ) == SAME && a.fromOffset == b.fromOffset ) {
				if ( a.site < b.site ) {
					// The site with lower id wins and it's document state will be final one.
					return getNoOp( a );
				} else {
					// The site with higher id will move the node to the place specified by the site with lower id.
					return createOperation( 'move', {
						fromAddress: copyAddress( b.toAddress ),
						fromOffset: b.toOffset,
						toAddress: copyAddress( a.toAddress ),
						toOffset: a.toOffset,
						node: b.node,
						site: a.site
					} );
				}
			}

			// Both move operations destinations are inside nodes that are also move operations origins.
			// So in other words, we move sub-trees into each others.
			if ( ( compare( a.toAddress, b.fromAddress ) == PREFIX && a.toAddress.path[ b.fromAddress.path.length ] == b.fromOffset ) &&
				 ( compare( b.toAddress, a.fromAddress ) == PREFIX && b.toAddress.path[ a.fromAddress.path.length ] == a.toOffset ) ) {

				// Instead of applying incoming operation, we revert site operation.
				// On the other side same will happen.
				return createOperation( 'move', {
					fromAddress: copyAddress( b.toAddress ),
					fromOffset: b.toOffset,
					toAddress: copyAddress( b.fromAddress ),
					toOffset: b.fromOffset,
					node: b.node,
					site: a.site
				} );
			}

			var b1 = createOperation( 'remove', {
				address: copyAddress( b.fromAddress ),
				offset: b.fromOffset,
				node: b.node,
				site: b.site
			} );

			var b2 = createOperation( 'insert', {
				address: copyAddress( b.toAddress ),
				offset: b.toOffset,
				node: b.node,
				site: b.site
			} );
			b2 = transform( b2, b1 );

			var a1 = transform( a, b1 );
			a1 = transform( a1, b2 );
			return a1;
		},
		noop: copyOperation
	},
	noop: {
		insert: getNoOp,
		remove: getNoOp,
		change: getNoOp,
		move: getNoOp,
		noop: getNoOp
	}
};

var OT = {
	// classes
	BlockNode: BlockNode,
	TextNode: TextNode,

	// namespaces
	IT: IT,
	OP: OP,

	// other functions
	createAddress: createAddress,
	copyAddress: copyAddress,
	createOperation: createOperation,
	copyOperation: copyOperation,
	applyOperation: applyOperation,
	getNode: getNode
};

if ( typeof module != 'undefined' ) {
	module.exports = OT;
}

if ( typeof define != 'undefined' ) {
	define( OT );
}