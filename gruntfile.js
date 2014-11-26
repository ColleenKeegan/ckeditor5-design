module.exports = function( grunt ) {
	require( 'load-grunt-tasks' )( grunt );

	var pkg = grunt.file.readJSON( 'package.json' );

	function getPlugins() {
		return Object.keys( pkg.dependencies )
			.filter( function( name ) {
				return name.indexOf( 'ckeditor-plugin-' ) === 0;
			} ).map( function( name ) {
				return 'plugins!' + name.replace( 'ckeditor-plugin-', '' );
			} );
	}

	grunt.initConfig( {
		clean: {
			build: [ 'build' ]
		},

		requirejs: {
			build: {
				options: {
					almond: true,
					baseUrl: 'node_modules/ckeditor-core/src/',
					include: [ 'ckeditor' ].concat( getPlugins() ),
					optimize: 'none',
					out: 'build/ckeditor.js',
					wrap: {
						start: '(function (root) {',
						end: 'root.CKEDITOR = root.CKEDITOR || {};\n' +
							'CKEDITOR.define = CKEDITOR.define || define;\n' +
							'CKEDITOR.require = CKEDITOR.require || require;\n' +
							'})(this);'
					}
				}
			}
		}
	} );

	grunt.registerTask( 'build', [ 'clean', 'requirejs' ] );
	grunt.registerTask( 'default', [ 'build' ] );
};
