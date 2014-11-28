module.exports = function (grunt) {
  grunt.initConfig({
    clean: {
      build: ['build/'],
      release: ['dist']
    },

    transpile: {
      main: {
        type: 'cjs',
        files: [{
          cwd: 'lib/',
          expand: true,
          dest: 'build/',
          src: '**/*.js'
        }]
      }
    },

    browserify: {
      build: {
        src: 'build/*.js',
        dest: 'build/browser.js'
      }
    },

    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['bower_components/sjcl/sjcl.js', 'build/browser.js'],
        dest: 'dist/slide.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');
  grunt.registerTask('default', ['clean', 'transpile', 'browserify', 'concat']);
};