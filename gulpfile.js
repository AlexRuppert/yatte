const gulp = require('gulp');
const change = require('gulp-change');
const merge = require('merge-stream');
const rename = require('gulp-rename');
const clone = require('gulp-clone');
const UglifyJS = require('uglify-js');
const util = require('gulp-util');

function removeES6Export(content) {
  return content.replace(/export default/g, 'window.yatte =');
}
function uglifyJS(content) {
  const result = UglifyJS.minify(content, { fromString: true });
  return result.code;
}
gulp.task('default', function () {
  const src = gulp.src('src/*js');

  const es6 = src;
 

  const browser = src
    .pipe(clone())
    .pipe(change(removeES6Export))
    .pipe(rename(function (path) {
      path.basename += "-browser";
    }))
  es6.pipe(change(uglifyJS));
  const merged = merge(es6, browser)
    //.pipe(change(uglifyJS));

  return merged
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', function () {
  gulp.watch('src/*.js', ['default']);
});