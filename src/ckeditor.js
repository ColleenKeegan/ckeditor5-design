/**
 * Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 * See LICENSE.md for license information.
 */

'use strict';

define( [ 'env', 'tools' ], function( env, tools ) {
	var CKEDITOR = window.CKEDITOR || ( window.CKEDITOR = {
		version: '5.0.0',

		init: function() {
			console.log( 'Initializing CKEditor ' + this.version );
			tools.checkWebkit();
		},

		// Expose the CKEditor API in the namespace.
		env: env,
		tools: tools
	} );

	return CKEDITOR;
} );
