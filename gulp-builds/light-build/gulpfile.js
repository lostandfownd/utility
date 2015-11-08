'use strict';
///// Load plugins and gulp
//  * Light Gulp build
//  * alpha version
//  * this would be used to create fast and small projects
////////////////////////////////////////////////////////////
  var gulp = require('gulp'),
      $ = require('gulp-load-plugins')({
        pattern: ['gulp-*', 'gulp.*'],
        replaceString: /\bgulp[\-.]/,
        lazy: true,
        camelize: true
      }),
      webserver = require('gulp-webserver'),
      runSequence = require('run-sequence'),
      pngquant = require('imagemin-pngquant'),
      optipng = require('imagemin-optipng'),
      imageop = require('gulp-image-optimization');

// Error handler
var errorHandler = function(err) {
  notifier.notify({ message: 'Error: ' + err.message });
  gutil.log(gutil.colors.red('Error'), err.message);
},

// Destinations and paths
  bower = {
    bower: './bower_components',
    vendorJs: './bower_components/**/*.js'
},
  dev = {
    dev: './app',
    css: './app/css/*.css',
    sass: './app/sass/**/*.scss',
    vendorJs: './app/js/vendor/*.js',
    js: './app/js/*.js',
    images: './app/img/*',
    fonts: './app/font',
    html: './app/*.html'
},
  prod = {
    dist: './dist/',
    css: './dist/css',
    images: './dist/img',
    js: './dist/js',
    fonts: './dist/font',
    vendorJs: './dist/js/vendor'
},
  clean = {
    css: './dist/css',
    js: './dist/js/*.js'
}

//// Webserver
  gulp.task('webserver', function() {
    gulp.src('./app/')
      .pipe(server({
        port:'9090',
        livereload: true,
        open: true
      }));
    console.log('Server Online !');
  });

///// Optimization and compilation tasks
  // node sass (libsass , compile time 2.1ms)
  gulp.task('libsass', function () {
      gulp.src(dev.sass)
          .pipe($.sass({errLogToConsole: true}))
          .pipe($.autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
           }))
          .pipe($.sourcemaps.write('app/css/map'))
          .pipe(gulp.dest('app/css'))
  });

  // image optimization
  gulp.task('imagemin', function () {
      return gulp.src(dev.images)
          .pipe($.imagemin({
              progressive: true,
              svgoPlugins: [{removeViewBox: false}],
              use: [pngquant()]
          }))
          .pipe($.filesize())
          .pipe(gulp.dest(dist.images));
  });
  // html minification
  gulp.task('htmloptimize', function () {
      return gulp.src(dev.html)
        .pipe($.htmlmin({
          collapseWhitespace: true
        }))
        .pipe(gulp.dest(dist.dist))
  });


///// Build tasks
  // html copy files
 gulp.task('html', function () {
   return gulp.src(dev.html)
     .pipe(gulp.dest(dist.dist))
     .pipe($.filesize())
 });
 //bower script helper
  gulp.task('bowerJs', function () {
    gulp.src(bower.vendorJs)
    .pipe(gulp.dest(dist.vendorJs))
  });
  // js vendor copy files
  gulp.task('vendor-copy', function () {
    gulp.src(dev.vendorJs)
      .pipe(gulp.dest(dist.vendorJs))
  });
  // font copy
  gulp.task('fonts', function () {
    gulp.src(dev.fonts)
      .pipe(gulp.dest(dist.fonts))
  });
  // cluster copy
  gulp.task('dist-cluster', function () {
    runSequence('html', 'imagemin', function () {
    return gulp.src(dev.vendorJs)
    .pipe(gulp.dest(dist.vendorJs))
    .on('end', function () {
      return  gulp.src(dev.fonts)
        .pipe(gulp.dest(dist.fonts))
    })
    .on('end', function () {
      return  gulp.src(dev.css)
        .pipe(gulp.dest(dist.css))
      })
    // copy any .txt files
    .on('end', function () {
      return gulp.src('./app/*.txt')
      .pipe(gulp.dest(dist.dist))
      })
    // copy any .xml files
    .on('end', function () {
      return gulp.src('./app/*.xml')
      .pipe(gulp.dest(dist.dist))
      })
    // copy any .xml files
    .on('end', function () {
      return gulp.src('./app/.htaccess')
      .pipe(gulp.dest(dist.dist))
      })
    });
  });

///// Watch tasks
  gulp.task('watch', function () {
      //  watch .scss files
      var sassWatcher = gulp.watch(dev.sass, ['libsass']);
          sassWatcher.on('change', function(event) {
              console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
          });

      // watch .html files (for now it's not usefull)
      // gulp.watch(dev.html, ['html']);
      // watch bower js
      gulp.watch(bower.bower, ['bowerJs']);
      // watch image files
      gulp.watch(dev.images, ['imagemin']);
      // .js files < we dont want to rev them >
      // gulp.watch(dev.js, ['cleanJs', 'rev-scripts']);
      // font files
      gulp.watch(dev.fonts, ['fonts']);
  });

///// General tasks
  // Development  (development run brute tasks)
  gulp.task('development', ['watch', 'serve']);

  // Production (optimize the files make them production ready)
  gulp.task('production', ['htmloptimize', 'gzip']);
