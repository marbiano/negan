'use strict';

var co = require('co');
var fs = require('co-fs-extra');
var path = require('path');
var cons = require('consolidate');
var matter = require('gray-matter');
var thunkify = require('thunkify');
var sass = require('node-sass');

sass.render = thunkify(sass.render);

exports.read = co.wrap(function* (route) {
  route.content = yield fs.readFile(route.flin, 'utf-8');
});

exports.write = co.wrap(function* (route) {
  if(route.type === 'html') route.flout = path.join(route.flout, 'index.html');
  yield fs.outputFile(route.flout, route.content);
});

exports.frontmatter = co.wrap(function* (route) {
  var file = matter(route.content);
  for (var option in route.opts) {
    file.data[option] = route.opts[option];
  }
  route.content = yield cons.handlebars.render(file.content, {helpers : file.data});
  if (typeof file.data.layout !== 'undefined') {
    route.content = yield cons.handlebars(file.data.layout, {content: route.content});
  }
});

exports.copy = co.wrap(function* (route) {
  yield fs.copy(route.flin, route.flout);
});

exports.sass = co.wrap(function* (route) {
  var file = yield sass.render({file: route.flin});
  route.content = file.css.toString();
});
