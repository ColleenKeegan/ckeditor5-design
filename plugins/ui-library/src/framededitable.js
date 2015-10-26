/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

/**
 * UI Library Framed Editable Component.
 *
 * @class FramedEditable
 * @extends View
 */

CKEDITOR.define( 'plugin!ui-library/framededitable', [ 'ui/view' ], function( View ) {
	class FramedEditable extends View {
		constructor( model ) {
			super( model );

			this.template = {
				tag: 'iframe',
				attrs: {
					'class': [ 'ck-framededitable' ],
					sandbox: 'allow-same-origin'
				}
			};
		}
	}

	return FramedEditable;
} );
