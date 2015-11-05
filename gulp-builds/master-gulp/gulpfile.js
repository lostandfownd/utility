'use strict';
///// Load plugins and gulp

//  THIS Gulp build has significat flaws that need to be fixed
//  The plan is to work with smaller gulp builds, and make them to suit diffrent
//  projects

// WHAT DOSENT WORK :
//  webserver
//  reving scripts fails somethimes
//  bower has a duplication while gulp task is running
//  after build in developent:
  //1 html does not copy
  //2 css does not copy somethimes
  //3

//  Plan for this file is to take it and split it into smaller chunks !

  var gulp = require('gulp'),
      $ = require('gulp-load-plugins')({
        pattern: ['gulp-*', 'gulp.*'],
        replaceString: /\bgulp[\-.]/,
        lazy: true,
        camelize: true
      }),
      cache = require('gulp-cached'), // inspect doc(forgot what it does)
      del = require('del'),
      webserver = require('gulp-webserver'),
      vinylPaths = require('vinyl-paths'), // inspect doc(forgot what it does)
      runSequence = require('run-sequence'),
      gulpif = require('gulp-if'),
      concat = require('gulp-concat'),
      pngquant = require('imagemin-pngquant'),
      optipng = require('imagemin-optipng'),
      imageop = require('gulp-image-optimization');

// Error handler
var errorHandler = function(err) {
  notifier.notify({ message: 'Error: ' + err.message });
  gutil.log(gutil.colors.red('Error'), err.message);
},

// paths + destinations to what i need
// Should be put in a config file and taken from there
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
  dist = {
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
// Webserver does not work, "cannot GET / error"
  gulp.task('serve', function () {
    gulp.src('./')
    .pipe(webserver({
      host : '0.0.0.0',
      open: true,
      fallback:   'index.html',
      livereload: true,
      port: 9000,
      directoryListing: {
        enable:true,
        path: 'app'
      }
    }))
      console.log('Server Online !');
  });

///// Useref
  gulp.task('useref', function () {
      var assets = $.useref.assets();

      return gulp.src(dev.html)
          .pipe(assets)
          .pipe(gulpif('*.js', $.uglify()))
          .pipe(gulpif('*.css', $.cssmin()))
          .pipe(assets.restore())
          .pipe($.useref())
          .pipe(gulp.dest(dist.dist));
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
  // js concatenation (not working !)
  gulp.task('concatjs', function() {
    return gulp.src(dev.js)
      .pipe(concat('main.min.js'))
      .pipe(gulp.dest(dist.js));
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
  // html optimization
  gulp.task('htmloptimize', function () {
      return gulp.src(dev.html)
        .pipe($.htmlmin({
          collapseWhitespace: true
        }))
        .pipe(gulp.dest(dist.dist))
  });
  // gzip
  gulp.task('gzip', function () {
      gulp.src(dev.css)
      .pipe($.gzip({
        gzipOptions: { level: 9 }
      }))
      .pipe(gulp.dest(dist.css));
  });

///// Copy tasks
  // html copy files
 gulp.task('html', function () {
   return gulp.src(dev.html)
     // rev html
     .on('end', function () {
     return gulp.src(['./rev-manifest.json', 'dist/*.html'])
       .pipe($.revCollector({
         replaceReved: true,
         dirReplacements: {
           'css': 'css',
           'js': 'js'
         }
        }))
       .pipe(gulp.dest(dist.dist))
     })
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

///// Revisioning
  // revision styles
  gulp.task('rev-styles', function () {
    return gulp.src(dev.css)
      .pipe($.rev())
      .pipe($.cssmin())
      .pipe(gulp.dest(dist.css))
      .pipe($.filesize())
      .pipe($.rev.manifest({merge: true}))
      .pipe(gulp.dest('./'))
      //rev replace
      .on('end', function() {
      return gulp.src(['./rev-manifest.json', 'dist/*.html'])
        .pipe($.revCollector({
          replaceReved: true,
          dirReplacements: {
            'css': 'css'
          }
        }))
      .pipe(gulp.dest(dist.dist))
    });
  });
  // revision scripts
    gulp.task('rev-scripts', function () {
      return gulp.src(dev.js)
        .pipe($.rev())
        .pipe($.uglify())
        .pipe(gulp.dest(dist.js))
        .pipe($.filesize())
        .pipe($.rev.manifest({merge: true}))
        .pipe(gulp.dest('./'))
        //rev replace
        .on('end', function () {
        return gulp.src(['./rev-manifest.json', 'dist/*.html'])
          .pipe($.revCollector({
            replaceReved: true,
            dirReplacements: {
              'js': 'js'
            }
          }))
          .pipe(gulp.dest(dist.dist))
        });
  });
  // revision cluster
  gulp.task('rev-cluster', function () {
  runSequence('rev-styles', 'rev-scripts', function () {
        console.log("Revision complete !");
    })
  });

///// Clean
  gulp.task('cleanJs', function (cb) {
    del([clean.js], cb);
  });
  gulp.task('cleanCss', function (cb) {
    del([dist.css], cb);
  });

///// Watch tasks
  gulp.task('watch', function () {
      // .scss files
      var sassWatcher = gulp.watch(dev.sass, ['libsass']);
          sassWatcher.on('change', function(event) {
              console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
          });
      // .css files
      // var cssWatcher =  gulp.watch(dev.css, ['cleanCss', 'rev-styles']);
      //     cssWatcher.on('change', function(event) {
      //         console.log('File' + event.path + ' was ' + event.type + ', running tasks...');
      //   });
      // .html files
      // gulp.watch(dev.html, ['html']);
      // bower js
      gulp.watch(bower.bower, ['bowerJs']);
      // image files
      gulp.watch(dev.images, ['imagemin']);
      // .js files < we dont want to rev them >
      // gulp.watch(dev.js, ['cleanJs', 'rev-scripts']);
      // font files
      gulp.watch(dev.fonts, ['fonts']);
  });

///// General tasks
  // Build
  gulp.task('build', ['dist-cluster', 'rev-cluster']);

  // Development
  gulp.task('development', ['watch', 'serve']);

  // Production
  gulp.task('production', ['htmloptimize', 'gzip']);
