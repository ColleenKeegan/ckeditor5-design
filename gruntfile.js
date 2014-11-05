module.exports = function( grunt ) {
	require( 'load-grunt-tasks' )( grunt );

	grunt.initConfig( {
		clean: {
			build: [ 'build' ]
		},

		requirejs: {
			build: {
				options: {
					almond: true,
					baseUrl: 'node_modules/ckeditor-core/',
					include: [
						'ckeditor',
						'plugins!example'
					],
					optimize: 'none',
					out: 'build/ckeditor.js'
					// packages: [ {
					// 	name: 'plugins/example',
					// 	location: '../ckeditor-plugin-example/src/'
					// } ]
				}
			}
		}
	} );

	grunt.registerTask( 'build', [ 'clean', 'requirejs' ] );
	grunt.registerTask( 'default', [ 'build' ] );
};
