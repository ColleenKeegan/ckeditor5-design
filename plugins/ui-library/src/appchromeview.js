/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

/**
 * UI Library App Chrome Component.
 *
 * @class AppChrome
 * @extends Chrome
 */

CKEDITOR.define( 'plugin!ui-library/appchromeview', [
	'plugin!ui-library/chromeview'
], function( ChromeView ) {
	class AppChromeView extends ChromeView {
		/**
		 * Creates an instance of the {@link AppChrome} class.
		 *
		 * @param {Model} mode (View)Model of this AppChrome.
		 * @constructor
		 */
		constructor( model ) {
			super( model );

			/**
			 * The template of this AppChrome.
			 */
			this.template.attrs.class.push( 'ck-app-chrome' );
		}
	}

	return AppChromeView;
} );