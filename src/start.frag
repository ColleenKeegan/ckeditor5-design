( function( root, factory ) {
		if ( typeof define === 'function' && define.amd ) {
			define('CKEDITOR', [], factory );
		} else {
			root.CKEDITOR = factory();
		}
	}( this, function() {
