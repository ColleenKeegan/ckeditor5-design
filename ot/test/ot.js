var assert = require( 'assert' );
var OT = require( '../ot.js' );

function insertNodes( parentNode, nodesList ) {
	for ( var i = 0; i < nodesList.length; i++ ) {
		parentNode.addChild( parentNode.getChildCount(), nodesList[ i ] );
	}
}

describe( 'OT', function() {
	var docRoot;
	
	beforeEach( function() {
		// Reset the main root before each test.
		docRoot = new OT.BlockNode( 'body' );
	} );


	/*
	 * First set of tests are simple tests of operations and whether their results are correct.
	 * We don't test BlockNode / TextNode classes methods because these are only example / temporary
	 * structures prototyped to be used with OT.IT transform functions.
	 *
	 * Since OT.IT transform functions are the main point of this prototype, we will test those
	 * extensively while leaving this set of tests pretty simple. We just need to be sure
	 * that after applying those operations we have correct trees.
	 */

	describe( 'OP (operation)', function() {
		describe( 'insert', function() {
			it( 'should append given node to a node specified by an address', function() {
				assert.equal( docRoot.getChildCount(), 0 );

				var address = OT.createAddress( docRoot, [ ] );
				OT.OP.insert( address, 0, new OT.BlockNode( 'p' ) );

				assert.equal( docRoot.getChildCount(), 1 );
			} );

			it( 'should append given node at specified offset', function() {
				insertNodes( docRoot, [
					new OT.TextNode( 'a' ), new OT.BlockNode( 'p' )
				] );

				insertNodes( docRoot.getChild( 1 ), [
					new OT.TextNode( 'x' ), new OT.TextNode( 'z' )
				] );

				var address = OT.createAddress( docRoot, [ 1 ] );
				var newNode = new OT.TextNode( 'y' );
				OT.OP.insert( address, 1, newNode );

				assert.equal( docRoot.getChild( 1 ).getChild( 1 ), newNode );
			} );
		} );

		describe( 'remove', function() {
			var address;

			beforeEach( function() {
				address = OT.createAddress( docRoot, [ ] );

				insertNodes( docRoot, [
					new OT.TextNode( 'a' ), new OT.TextNode( 'b' )
				] );
			} );

			it( 'should un-append the node specified by an address', function() {
				OT.OP.remove( address, 0 );

				assert.equal( docRoot.getChildCount(), 1 );
			} );

			it( 'should reassign offsets of children after removing an item', function() {
				OT.OP.remove( address, 0 );

				assert.equal( docRoot.getChild( 0 ).char, 'b' );
			} );
		} );

		describe( 'change', function() {
			var address;

			beforeEach( function() {
				address = OT.createAddress( docRoot, [ ] );

				insertNodes( docRoot, [
					new OT.TextNode( 'a' ), new OT.TextNode( 'b' )
				] );
			} );

			it( 'should change attribute of the node specified by an address', function() {
				OT.OP.change( address, 1, 'foo', 'bar' );

				assert.equal( docRoot.getChild( 1 ).getAttrValue( 'foo' ), 'bar' );
			} );

			it( 'should remove attribute if value was not specified or it was an empty string', function() {
				OT.OP.change( address, 1, 'foo', 'bar' );
				OT.OP.change( address, 1, 'foo' );

				assert.equal( docRoot.getChild( 1 ).getAttrValue( 'foo' ), null );

				OT.OP.change( address, 1, 'foo', 'bar' );
				OT.OP.change( address, 1, 'foo', '' );

				assert.equal( docRoot.getChild( 1 ).getAttrValue( 'foo' ), null );
			} );

			it( 'should overwrite the attribute\'s value if it was already set', function() {
				OT.OP.change( address, 1, 'foo', 'bar' );
				OT.OP.change( address, 1, 'foo', 'xyz' );

				assert.equal( docRoot.getChild( 1 ).getAttrValue( 'foo' ), 'xyz' );
			} );

			it( 'should support adding multiple attributes to one node', function() {
				OT.OP.change( address, 1, 'foo', 'bar' );
				OT.OP.change( address, 1, 'abc', 'xyz' );

				assert.equal( docRoot.getChild( 1 ).getAttrValue( 'foo' ), 'bar' );
				assert.equal( docRoot.getChild( 1 ).getAttrValue( 'abc' ), 'xyz' );
			} );
		} );

		describe( 'move', function() {
			var fromAddress, toAddress, node;
			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 0 ] );
				toAddress = OT.createAddress( docRoot, [ 1 ] );

				insertNodes( docRoot, [
					new OT.BlockNode( 'a' ), new OT.BlockNode( 'b' )
				] );

				docRoot.getChild( 0 ).addChild( 0, new OT.BlockNode( 'c' ) );
				docRoot.getChild( 1 ).addChild( 0, new OT.BlockNode( 'd' ) );

				node = docRoot.getChild( 0 ).getChild( 0 );
			} );

			it( 'should remove a node from specified address and offset', function() {
				OT.OP.move( fromAddress, 0, node, toAddress, 1 );

				assert.equal( docRoot.getChild( 0 ).getChildCount(), 0 );
			} );

			it( 'should add a node to at specified address and offset', function() {
				OT.OP.move( fromAddress, 0, node, toAddress, 1 );

				assert.equal( docRoot.getChild( 1 ).getChildCount(), 2 );
				assert.equal( docRoot.getChild( 1 ).getChild( 1 ), node );
			} );

			it( 'should throw when trying to move a node inside itself', function() {
				assert.throws(
					function() {
						OT.OP.move( fromAddress, 0, node, OT.createAddress( docRoot, [ 0, 0 ], 1 ), 0 );
					},
					Error
				);
			} );
		} );
	} );



	/*
	 * Second set of tests is testing if operations are correctly transformed against each other.
	 * The way to read descriptions is: <operation> transformed against <operation> should ...
	 * So, "ins x ins" means "insert operation transformed against insert operation" should ...
	 */

	describe( 'IT (inclusion transformation)', function() {
		var addressPair, nodeA, nodeB;

		beforeEach( function() {
			// is in beforeEach because otherwise docRoot is undefined
			addressPair = {
				// address A (0) is different than address B (1)
				diff: [
					OT.createAddress( docRoot, [ 0, 2, 1, 3 ], 1 ),
					OT.createAddress( docRoot, [ 0, 2, 4, 1, 0 ], 2 )
				],

				// address A (0) is a prefix of address B (1)
				prefix: [
					OT.createAddress( docRoot, [ 0, 1, 1 ], 1 ),
					OT.createAddress( docRoot, [ 0, 1, 1, 3 ], 2 )
				],

				// address A (0) is exactly same as B (1)
				same: [
					OT.createAddress( docRoot, [ 0, 2, 3 ], 1 ),
					OT.createAddress( docRoot, [ 0, 2, 3 ], 2 )
				]
			};

			nodeA = new OT.BlockNode( 'a' );
			nodeB = new OT.BlockNode( 'b' );
		} );

		function getTransformedOp( doneOpType, toTransformOpType, params ) {
			var doneOpParams = {};
			var toTransformOpParams = {};

			for ( var i in params ) {
				if ( params.hasOwnProperty( i ) ) {
					if ( params[ i ][ 0 ] !== null ) {
						doneOpParams[ i ] = params[ i ][ 0 ];
					}
					if ( params[ i ][ 1 ] !== null ) {
						toTransformOpParams[ i ] = params[ i ][ 1 ];
					}
				}
			}

			if ( !( 'site' in doneOpParams ) ) {
				doneOpParams.site = 2;
			}
			if ( !( 'site' in toTransformOpParams ) ) {
				toTransformOpParams.site = 1;
			}

			var doneOp = OT.createOperation( doneOpType, doneOpParams );
			var toTransformOp = OT.createOperation( toTransformOpType, toTransformOpParams );

			return OT.IT[ toTransformOpType ][ doneOpType ]( toTransformOp, doneOp );
		}

		function expectOperation( op, params ) {
			for ( var i in params ) {
				if ( params.hasOwnProperty( i ) ) {
					if ( i.toLowerCase().indexOf( 'address' ) == -1 ) {
						assert.equal( op[ i ], params[ i ] );
					} else {
						assert.deepEqual( op[ i ], params[ i ] );
					}
				}
			}
		}

		describe( 'ins x ins', function() {
			it( 'should not change when addresses are different', function() {
				var adr = addressPair.diff;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'insert', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );

			it( 'should increment offset if addresses are same and offset is after applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'insert', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 3,
					node: nodeB
				} );
			} );

			it( 'should not increment offset if addresses are same and offset is before applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'insert', {
					address: adr,
					offset: [ 2, 0 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 0,
					node: nodeB
				} );
			} );

			it( 'should update address at node(i) if applied operation\'s address was a prefix and its offset is before node(i)', function() {
				var adr = addressPair.prefix;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'insert', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				newAdr.path[ 3 ] = 4;

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );
		} );

		describe( 'ins x rmv', function() {
			it( 'should not change when addresses are different', function() {
				var adr = addressPair.diff;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'insert', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );

			it( 'should decrement offset if addresses are same and offset is after applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'insert', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 1,
					node: nodeB
				} );
			} );

			it( 'should not decrement offset if addresses are same and offset is before applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'insert', {
					address: adr,
					offset: [ 2, 0 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 0,
					node: nodeB
				} );
			} );

			it( 'should update address at node(i) if applied operation\'s address was a prefix and its offset is before node(i)', function() {
				var adr = addressPair.prefix;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'insert', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				newAdr.path[ 3 ] = 2;

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );

			it( 'should become do-nothing operation if insertion is in removed part of tree', function() {
				var adr = addressPair.prefix;

				var transOp = getTransformedOp( 'remove', 'insert', {
					address: adr,
					offset: [ 3, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'noop'
				} );
			} );
		} );

		describe( 'ins x chn', function() {
			it( 'should not change', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'change', 'insert', {
					address: adr,
					offset: [ 2, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'insert',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );
		} );

		describe( 'ins x mov', function() {
			var fromAddress, toAddress;

			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				toAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
			} );

			it( 'should not change if insert is in different path than move origin and destination', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 3 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.insert.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: newAddress,
					offset: 2,
					node: nodeA
				} );
			} );

			it( 'should have it\'s address merged with destination address if insert was inside moved node sub-tree', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0, 3 ] );
				var newAddress = OT.createAddress( docRoot, [ 1, 1, 0, 0, 3 ] );

				var inOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ 0, 2 ], 2 ),
					fromOffset: 0,
					node: nodeA,
					toAddress: OT.createAddress( docRoot, [ 1, 1, 1 ], 2 ),
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.insert.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: newAddress,
					offset: 2,
					node: nodeA
				} );
			} );

			it( 'should decrement offset if address is same as move origin and insert offset is after moved node offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.insert.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: newAddress,
					offset: 1,
					node: nodeA
				} );
			} );

			it( 'should increment offset if address is same as move destination and insert offset is after move-to offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.insert.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: newAddress,
					offset: 3,
					node: nodeA
				} );
			} );

			it( 'should update address if moved node is next to a node from insert path', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1, 1 ] );
				var newAddress = OT.copyAddress( opAddress );
				newAddress.path[ 2 ] = 0;

				var inOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.insert.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: newAddress,
					offset: 2,
					node: nodeA
				} );
			} );

			it( 'should update address if move-in destination is next to a node from insert path', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0, 1 ] );
				var newAddress = OT.copyAddress( opAddress );
				newAddress.path[ 3 ] = 2;

				var inOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.insert.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: newAddress,
					offset: 2,
					node: nodeA
				} );
			} );
		} );

		describe( 'rmv x ins', function() {
			it( 'should not change when addresses are different', function() {
				var adr = addressPair.diff;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'remove', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );

			it( 'should increment offset if addresses are same and offset is after applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'remove', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 3,
					node: nodeB
				} );
			} );

			it( 'should increment offset if addresses are same and offset is same as applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'remove', {
					address: adr,
					offset: [ 2, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 3,
					node: nodeB
				} );
			} );

			it( 'should not increment offset if addresses are same and offset is before applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'remove', {
					address: adr,
					offset: [ 2, 0 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 0,
					node: nodeB
				} );
			} );

			it( 'should update address at node(i) if applied operation\'s address was a prefix and its offset is before node(i)', function() {
				var adr = addressPair.prefix;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'remove', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				newAdr.path[ 3 ] = 4;

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );
		} );

		describe( 'rmv x rmv', function() {
			it( 'should not change when addresses are different', function() {
				var adr = addressPair.diff;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'remove', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );

			it( 'should decrement offset if addresses are same and offset is after applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'remove', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 1,
					node: nodeB
				} );
			} );

			it( 'should not decrement offset if addresses are same and offset is before applied operation', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'remove', {
					address: adr,
					offset: [ 2, 0 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 0,
					node: nodeB
				} );
			} );

			it( 'should update address at node(i) if applied operation\'s address was a prefix and its offset is before node(i)', function() {
				var adr = addressPair.prefix;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'remove', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, nodeB ]
				} );

				newAdr.path[ 3 ] = 2;

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );

			it( 'should become do-nothing operation if one of nodes on the address path was removed', function() {
				var adr = addressPair.prefix;

				var transOp = getTransformedOp( 'remove', 'remove', {
					address: adr,
					offset: [ 3, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'noop'
				} );
			} );

			it( 'should become do-nothing operation if the other remove operations is exactly the same', function() {
				var adr = addressPair.same;

				var transOp = getTransformedOp( 'remove', 'remove', {
					address: adr,
					offset: [ 1, 1 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'noop'
				} );
			} );
		} );

		describe( 'rmv x chn', function() {
			it( 'should not change', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'change', 'remove', {
					address: adr,
					offset: [ 2, 2 ],
					node: [ nodeA, nodeB ]
				} );

				expectOperation( transOp, {
					type: 'remove',
					address: newAdr,
					offset: 2,
					node: nodeB
				} );
			} );
		} );

		describe( 'rmv x mov', function() {
			var fromAddress, toAddress;

			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				toAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
			} );

			it( 'should not change if remove is in different path than move origin and destination', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 3 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 2
				} );
			} );

			it( 'should have it\'s address merged with destination address if remove was inside moved node sub-tree', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 1 ] );
				var newAddress = OT.createAddress( docRoot, [ 0, 0, 1 ] );

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ ], 2 ),
					fromOffset: 0,
					node: nodeA,
					toAddress: OT.createAddress( docRoot, [ 1 ], 2 ),
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 0
				} );
			} );

			it( 'should have it\'s address updated if remove target was move origin target', function() {
				var opAddress = OT.createAddress( docRoot, [ ] );
				var newAddress = OT.createAddress( docRoot, [ 0 ] );

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ ], 2 ),
					fromOffset: 0,
					node: nodeA,
					toAddress: OT.createAddress( docRoot, [ 1 ], 2 ),
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 0
				} );
			} );

			it( 'should decrement offset if address is same as move origin and remove offset is after moved node offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 1
				} );
			} );

			it( 'should increment offset if address is same as move destination and insert offset is after move-to offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 3
				} );
			} );

			it( 'should update address if moved node is next to a node from insert path', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1, 1 ] );
				var newAddress = OT.copyAddress( opAddress );
				newAddress.path[ 2 ] = 0;

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 2
				} );
			} );

			it( 'should update address if move-in destination is next to a node from insert path', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0, 1 ] );
				var newAddress = OT.copyAddress( opAddress );
				newAddress.path[ 3 ] = 2;

				var inOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.remove.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'remove',
					address: newAddress,
					offset: 2
				} );
			} );
		} );

		describe( 'chn x ins', function() {
			it( 'should not change when addresses are different', function() {
				var adr = addressPair.diff;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'change', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 2,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should increment offset if insert offset was before changed node', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'change', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 3,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should not change if insert offset was after changed node', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'insert', 'change', {
					address: adr,
					offset: [ 2, 0 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should update address at node(i) if applied operation\'s address was a prefix and its offset is before node(i)', function() {
				var adr = addressPair.prefix;
				var newAdr = OT.copyAddress( adr[ 1 ] );
				newAdr.path[ 3 ] = 4;

				var transOp = getTransformedOp( 'insert', 'change', {
					address: adr,
					offset: [ 0, 0 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );
		} );

		describe( 'chn x rmv', function() {
			it( 'should not change when addresses are different', function() {
				var adr = addressPair.diff;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'change', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 2,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should decrement offset if remove offset was before changed node', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'change', {
					address: adr,
					offset: [ 0, 2 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 1,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should not change if remove offset was after changed node', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'remove', 'change', {
					address: adr,
					offset: [ 2, 0 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should update address at node(i) if applied operation\'s address was a prefix and its offset is before node(i)', function() {
				var adr = addressPair.prefix;
				var newAdr = OT.copyAddress( adr[ 1 ] );
				newAdr.path[ 3 ] = 2;

				var transOp = getTransformedOp( 'remove', 'change', {
					address: adr,
					offset: [ 0, 0 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should become do-nothing operation if one of nodes on the address path was removed', function() {
				var adr = addressPair.prefix;
				var transOp = getTransformedOp( 'remove', 'change', {
					address: adr,
					offset: [ 3, 0 ],
					node: [ nodeA, null ],
					attr: [ null, 'foo' ],
					value: [ null, 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'noop'
				} );
			} );
		} );

		describe( 'chn x chn', function() {
			it( 'should not change if address is same but attribute is different', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'change', 'change', {
					address: adr,
					offset: [ 0, 0 ],
					attr: [ 'abc', 'foo' ],
					value: [ 'xyz', 'bar' ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should not become do-nothing operation if address and attribute is same but value is different and address site is higher', function() {
				var adr = addressPair.same;
				var newAdr = OT.copyAddress( adr[ 1 ] );

				var transOp = getTransformedOp( 'change', 'change', {
					address: adr,
					offset: [ 0, 0 ],
					attr: [ 'foo', 'foo' ],
					value: [ 'bar', 'xyz' ],
					site: [ 1, 2 ]
				} );

				expectOperation( transOp, {
					type: 'change',
					address: newAdr,
					offset: 0,
					attr: 'foo',
					value: 'xyz'
				} );
			} );

			it( 'should become do-nothing operation if address and attribute is same but value is different and address site is lower', function() {
				var adr = addressPair.same;

				var transOp = getTransformedOp( 'change', 'change', {
					address: adr,
					offset: [ 0, 0 ],
					attr: [ 'foo', 'foo' ],
					value: [ 'bar', 'xyz' ]
				} );

				expectOperation( transOp, {
					type: 'noop'
				} );
			} );
		} );

		describe( 'chn x mov', function() {
			var fromAddress, toAddress;

			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				toAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
			} );

			it( 'should not change if change target is in different path than move origin and destination', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 3 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'change', {
					address: opAddress,
					offset: 0,
					attr: 'foo',
					value: 'bar',
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.change.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'change',
					address: newAddress,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should have it\'s address merged with destination address if change was inside moved node sub-tree', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 1, 0 ] );
				var newAddress = OT.createAddress( docRoot, [ 1, 1, 1, 0 ] );

				var inOp = OT.createOperation( 'change', {
					address: opAddress,
					offset: 2,
					attr: 'foo',
					value: 'bar',
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ 0 ] ),
					fromOffset: 1,
					node: nodeA,
					toAddress: OT.createAddress( docRoot, [ 1, 1 ] ),
					toOffset: 1,
					site: 2
				} );

				var transOp = OT.IT.change.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'change',
					address: newAddress,
					offset: 2,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should decrement offset if address is same as move origin and change offset is after moved node offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'change', {
					address: opAddress,
					offset: 2,
					attr: 'foo',
					value: 'bar',
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.change.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'change',
					address: newAddress,
					offset: 1,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should increment offset if address is same as move destination and change offset is after move-to offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
				var newAddress = OT.copyAddress( opAddress );

				var inOp = OT.createOperation( 'change', {
					address: opAddress,
					offset: 1,
					attr: 'foo',
					value: 'bar',
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.change.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'change',
					address: newAddress,
					offset: 2,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should update address if moved node is next to a node from insert path', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1, 1 ] );
				var newAddress = OT.copyAddress( opAddress );
				newAddress.path[ 2 ] = 0;

				var inOp = OT.createOperation( 'change', {
					address: opAddress,
					offset: 0,
					attr: 'foo',
					value: 'bar',
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.change.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'change',
					address: newAddress,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );

			it( 'should update address if move-in destination is next to a node from insert path', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0, 1 ] );
				var newAddress = OT.copyAddress( opAddress );
				newAddress.path[ 3 ] = 2;

				var inOp = OT.createOperation( 'change', {
					address: opAddress,
					offset: 0,
					attr: 'foo',
					value: 'bar',
					site: 1
				} );

				var siOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 0,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.change.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'change',
					address: newAddress,
					offset: 0,
					attr: 'foo',
					value: 'bar'
				} );
			} );
		} );

		describe( 'mov x ins', function() {
			var fromAddress, toAddress, newFromAddress, newToAddress;

			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				newFromAddress = OT.copyAddress( fromAddress );
				toAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
				newToAddress = OT.copyAddress( toAddress );
			} );

			// insert in different spots than move op
			it( 'should not change if origin and destination are different than insert address', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 3 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.insert( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// insert inside moved node
			it( 'should not change if insert was inside moved sub-tree', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1, 2, 3 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.insert( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// insert next to moved node
			it( 'should increment offset if insert was in the same parent but before moved node', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 1,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.insert( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 3,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// insert next to a path to moved node
			it( 'should update origin path if insert was next to a node on that path', function() {
				var opAddress = OT.createAddress( docRoot, [ 1 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 1,
					node: nodeA,
					site: 2
				} );

				newFromAddress.path[ 1 ] = 2;

				var transOp = OT.IT.move.insert( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// insert next to destination
			it( 'should increment offset if insert was in the destination node and before move offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 0
				} );

				var siOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 0,
					node: nodeA,
					site: 1
				} );

				var transOp = OT.IT.move.insert( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 1
				} );
			} );

			// insert next to a path to destination
			it( 'should update destination path if insert was next to a node on that path', function() {
				var opAddress = OT.createAddress( docRoot, [ 0 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'insert', {
					address: opAddress,
					offset: 0,
					node: nodeA,
					site: 2
				} );

				newToAddress.path[ 1 ] = 3;

				var transOp = OT.IT.move.insert( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );
		} );

		describe( 'mov x rem', function() {
			var fromAddress, toAddress, newFromAddress, newToAddress;

			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				newFromAddress = OT.copyAddress( fromAddress );
				toAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );
				newToAddress = OT.copyAddress( toAddress );
			} );

			// remove in different spots than move op
			it( 'should not change if origin and destination are different than remove address', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 3 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// remove inside moved node
			it( 'should not change if remove was inside moved sub-tree', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1, 2, 3 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// remove next to moved node
			it( 'should decrement offset if remove was in the same parent but before moved node', function() {
				var opAddress = OT.createAddress( docRoot, [ 1, 1 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 1,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 1,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// remove next to a path to moved node
			it( 'should update origin path if remove was next to a node on that path', function() {
				var opAddress = OT.createAddress( docRoot, [ 1 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 0,
					node: nodeA,
					site: 2
				} );

				newFromAddress.path[ 1 ] = 0;

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// remove next to destination
			it( 'should decrement offset if remove was in the destination node and before move offset', function() {
				var opAddress = OT.createAddress( docRoot, [ 0, 2, 0 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 2,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 0,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 1
				} );
			} );

			// remove next to a path to destination
			it( 'should update destination path if remove was next to a node on that path', function() {
				var opAddress = OT.createAddress( docRoot, [ 0 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 0,
					node: nodeA,
					site: 2
				} );

				newToAddress.path[ 1 ] = 1;

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: 2,
					toAddress: newToAddress,
					toOffset: 0
				} );
			} );

			// origin removed
			it( 'should become insert operation if one of nodes on origin path got removed', function() {
				var opAddress = OT.createAddress( docRoot, [ 1 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 1,
					site: 2
				} );

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'insert',
					address: toAddress,
					node: nodeA,
					offset: 0
				} );
			} );

			// destination removed
			it( 'should become do-nothing operation if one of nodes on destination path got removed', function() {
				var opAddress = OT.createAddress( docRoot, [ 0 ] );

				var inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: 2,
					node: nodeA,
					toAddress: toAddress,
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'remove', {
					address: opAddress,
					offset: 2,
					node: nodeA,
					site: 2
				} );

				var transOp = OT.IT.move.remove( inOp, siOp );

				expectOperation( transOp, {
					type: 'noop'
				} );
			} );
		} );

		describe( 'mov x chn', function() {
			// remove in different spots than move op
			it( 'should not change', function() {
				var inOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ 0, 1 ], 1 ),
					fromOffset: 0,
					node: nodeA,
					toAddress: OT.createAddress( docRoot, [ 0, 3 ], 1 ),
					toOffset: 0,
					site: 1
				} );

				var siOp = OT.createOperation( 'change', {
					address: OT.createAddress( docRoot, [ 0, 1 ], 2 ),
					offset: 0,
					attr: 'foo',
					value: 'bar',
					site: 2
				} );

				var transOp = OT.IT.move.change( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: OT.createAddress( docRoot, [ 0, 1 ], 1 ),
					fromOffset: 0,
					toAddress: OT.createAddress( docRoot, [ 0, 3 ], 1 ),
					toOffset: 0
				} );
			} );
		} );

		describe( 'mov x mov', function() {
			var fromAddress, toAddress, fromOffset, toOffset, newFromAddress, newToAddress, inOp, siteMoveAddress;

			beforeEach( function() {
				fromAddress = OT.createAddress( docRoot, [ 1 ] );
				fromOffset = 1;
				newFromAddress = OT.copyAddress( fromAddress );

				toAddress = OT.createAddress( docRoot, [ 2 ] );
				toOffset = 1;
				newToAddress = OT.copyAddress( toAddress );

				inOp = OT.createOperation( 'move', {
					fromAddress: fromAddress,
					fromOffset: fromOffset,
					node: nodeA,
					toAddress: toAddress,
					toOffset: toOffset,
					site: 1
				} );
			} );

			// remove in different spots than move op
			it( 'should not change if both operations are happening in different parts of tree', function() {
				siteMoveAddress = OT.createAddress( docRoot, [ 3 ] );

				var siOp = OT.createOperation( 'move', {
					fromAddress: siteMoveAddress,
					fromOffset: 0,
					node: nodeB,
					toAddress: siteMoveAddress,
					toOffset: 4,
					site: 2
				} );

				var transOp = OT.IT.move.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: fromOffset,
					toAddress: newToAddress,
					toOffset: toOffset
				} );
			} );

			describe( 'when incoming move origin node does not and is not contained by on-site move origin node', function() {
				beforeEach( function() {
					siteMoveAddress = OT.createAddress( docRoot, [ 3 ] );
				} );

				it( 'should decrement origin offset if affected by on-site move-out', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [ 1 ], 2 ),
						fromOffset: 0,
						node: nodeB,
						toAddress: siteMoveAddress,
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					fromOffset--;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should increment origin offset if affected by on-site move-to', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: siteMoveAddress,
						fromOffset: 0,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 1 ], 2 ),
						toOffset: 1,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					fromOffset++;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should update origin and destination path if affected by on-site move-out', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [], 2 ),
						fromOffset: 0,
						node: nodeB,
						toAddress: siteMoveAddress,
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					newFromAddress.path[ 0 ]--;
					newToAddress.path[ 0 ]--;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should update origin and destination path if affected by on-site move-to', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: siteMoveAddress,
						fromOffset: 0,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [], 2 ),
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					newFromAddress.path[ 0 ]++;
					newToAddress.path[ 0 ]++;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should decrement destination offset if affected by on-site move-out', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [ 2 ], 2 ),
						fromOffset: 0,
						node: nodeB,
						toAddress: siteMoveAddress,
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					toOffset--;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should increment destination offset affected by on-site move-to', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: siteMoveAddress,
						fromOffset: 0,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 2 ], 2 ),
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					toOffset++;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );
			} );

			describe( 'when incoming move origin node sub-tree contains on-site move origin', function() {
				beforeEach( function() {
					siteMoveAddress = OT.createAddress( docRoot, [ 1, 1 ] );
				} );

				it( 'should decrement origin offset if affected by on-site move-out', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [ 1 ], 2 ),
						fromOffset: 0,
						node: nodeB,
						toAddress: siteMoveAddress,
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					fromOffset--;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should increment origin offset if affected by on-site move-to', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: siteMoveAddress,
						fromOffset: 0,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 1 ], 2 ),
						toOffset: 1,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					fromOffset++;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should update origin and destination path if affected by on-site move-out', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [], 2 ),
						fromOffset: 0,
						node: nodeB,
						toAddress: siteMoveAddress,
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					newFromAddress.path[ 0 ]--;
					newToAddress.path[ 0 ]--;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should update origin and destination path if affected by on-site move-to', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: siteMoveAddress,
						fromOffset: 0,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [], 2 ),
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					newFromAddress.path[ 0 ]++;
					newToAddress.path[ 0 ]++;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should decrement destination offset if affected by on-site move-out', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [ 2 ], 2 ),
						fromOffset: 0,
						node: nodeB,
						toAddress: siteMoveAddress,
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					toOffset--;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );

				it( 'should increment destination offset affected by on-site move-to', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: siteMoveAddress,
						fromOffset: 0,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 2 ], 2 ),
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					toOffset++;

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );
			} );

			it( 'should not change if on-site move is from non-affecting position to inside of moved sub-tree', function() {
				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ ], 2 ),
					fromOffset: 3,
					node: nodeB,
					toAddress: OT.createAddress( docRoot, [ 1, 1 ], 2 ),
					toOffset: 1,
					site: 2
				} );

				var transOp = OT.IT.move.move( inOp, siOp );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: fromOffset,
					toAddress: newToAddress,
					toOffset: toOffset
				} );
			} );

			it( 'should update origin address if on-site move origin node sub-tree includes incoming move origin node', function() {
				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ ], 2 ),
					fromOffset: 1,
					node: nodeB,
					toAddress: OT.createAddress( docRoot, [ 2 ], 2 ),
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.move.move( inOp, siOp );

				newFromAddress = OT.createAddress( docRoot, [ 1 , 0 ] );
				newToAddress.path[ 0 ]--;
				toOffset++;

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: fromOffset,
					toAddress: newToAddress,
					toOffset: toOffset
				} );
			} );

			it( 'should update destination address if incoming move destination is inside of on-site moved sub-tree', function() {
				var siOp = OT.createOperation( 'move', {
					fromAddress: OT.createAddress( docRoot, [ ], 2 ),
					fromOffset: 2,
					node: nodeB,
					toAddress: OT.createAddress( docRoot, [ ], 2 ),
					toOffset: 0,
					site: 2
				} );

				var transOp = OT.IT.move.move( inOp, siOp );

				newFromAddress.path[ 0 ]++;
				newToAddress = OT.createAddress( docRoot, [ 0 ] );

				expectOperation( transOp, {
					type: 'move',
					fromAddress: newFromAddress,
					fromOffset: fromOffset,
					toAddress: newToAddress,
					toOffset: toOffset
				} );
			} );

			describe( 'when both move operations\' destinations are inside of moved sub-trees', function() {
				it( 'should be changed to no-op if incoming operation has lower site id', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [ ], 2 ),
						fromOffset: 2,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 1, 1, 1 ], 2 ),
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					expectOperation( transOp, {
						type: 'noop'
					} );
				} );

				it( 'should not change if incoming operation has higher site id', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, [ ], 0 ),
						fromOffset: 2,
						node: nodeA,
						toAddress: OT.createAddress( docRoot, [ 1, 1, 1 ], 0 ),
						toOffset: 0,
						site: 0
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );
			} );

			describe( 'when both move operations have same origin node', function() {
				it( 'should be changed to no-op if incoming operation has lower site id', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, fromAddress.path.slice(), 2 ),
						fromOffset: fromOffset,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 1, 1, 1 ], 2 ),
						toOffset: 0,
						site: 2
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					expectOperation( transOp, {
						type: 'noop'
					} );
				} );

				it( 'should not change if incoming operation has higher site id', function() {
					var siOp = OT.createOperation( 'move', {
						fromAddress: OT.createAddress( docRoot, fromAddress.path.slice(), 0 ),
						fromOffset: fromOffset,
						node: nodeB,
						toAddress: OT.createAddress( docRoot, [ 1, 1, 1 ], 0 ),
						toOffset: 0,
						site: 0
					} );

					var transOp = OT.IT.move.move( inOp, siOp );

					expectOperation( transOp, {
						type: 'move',
						fromAddress: newFromAddress,
						fromOffset: fromOffset,
						toAddress: newToAddress,
						toOffset: toOffset
					} );
				} );
			} );
		} );
	} );
} );