module.exports = function(grunt) {
	// Bulk load all tasks
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		jshint: {
			options: {
				force: false,
				jshintrc: true
			},
			files: ['jqPropertyGrid.js']
		},
		jscs: {
			options: {
				force: true,
				config: true
			},
			files: {
				src: ['jqPropertyGrid.js']
			}
		}
	});

	//<editor-fold desc="// Tasks {...}">

	grunt.registerTask('default', ['jshint', 'jscs']);

	//</editor-fold>
};
