/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

CKEDITOR.define( [ 'ui/view' ], function( View ) {
	/**
	 * Creates an instance of the {@link Chrome} class.
	 *
	 * @param {Model} mode (View)Model of this Chrome.
	 * @constructor
	 */
	class Chrome extends View {
		constructor( model ) {
			super( model );

			/**
			 * The template of this button.
			 */
			this.template = {
				tag: 'div',
				attributes: {
					'class': [ 'ck-chrome' ]
				}
			};
		};
	}

	return Chrome;
} );
