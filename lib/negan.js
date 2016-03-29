'use strict';

var co = require('co');
var fs = require('co-fs-extra');
var path = require('path');
var cons = require('consolidate');
var matter = require('gray-matter');
var thunkify = require('thunkify');
var sass = require('node-sass');
var uglify = require("uglify-js");

sass.render = thunkify(sass.render);

exports = module.exports = Negan;

function Negan (directory) {
	if (!(this instanceof Negan)) return new Negan(directory);
  this.directory = directory || '.';
	this.routes = [];
  this.assets = { css: [], js: [], img: [] };
}

Negan.prototype.on = function(destiny, source, options) {
  var route = {destiny: destiny, source: source, options: options};
  this.routes.push(route);
  return this;
}

Negan.prototype.build = function() {
  console.time("build");
  this.buildFiles(this.routes).then(
    function() {
      console.timeEnd("build");
    }, function (err) {
      console.error(err.stack);
    }
  );
};

Negan.prototype.readFile = co.wrap(function* (dir) {
  var buffer = yield fs.readFile(dir, 'utf-8');
  return buffer;
});

Negan.prototype.readCSS = co.wrap(function* (dir) {
  var result;
  if(path.extname(dir) === '.scss') {
    result = yield sass.render({file: dir});
    result = result.css.toString();
  } else {
    result = yield fs.readFile(dir, 'utf-8');
  }
  return result;
});

Negan.prototype.processFile = co.wrap(function* (file, options) {
  var source = matter(file);
  for (var option in options) {
    source.data[option] = options[option];
  }
  var content = yield cons.handlebars.render(source.content, {helpers : source.data});
  if (typeof source.data.layout !== 'undefined') {
    content = yield cons.handlebars(source.data.layout, {content: content});
  }
  return content;
});

Negan.prototype.writeFile = co.wrap(function* (dir, content) {
  yield fs.outputFile(dir, content);
});

Negan.prototype.copyFile = co.wrap(function* (dir, destination) {
  yield fs.copy(dir, destination);
});

Negan.prototype.buildFile = co.wrap(function* (route) {
  console.time(route.destiny);
  switch (path.extname(route.source)) {
    case '.html':
      var file = yield this.readFile(route.source);
      var content = yield this.processFile(file, route.options);
      yield this.writeFile(path.join(this.directory, route.destiny, 'index.html'), content);
      break;
    case '.css':
    case '.scss':
      var content = yield this.readCSS(route.source);
      yield this.writeFile(path.join(this.directory, route.destiny), content);
      break
    case '.js':
    case '.jpg':
    case '.png':
    case '.gif':
      yield this.copyFile(route.source, path.join(this.directory, route.destiny));
      break;
    default:
      yield this.copyFile(route.source, path.join(this.directory, route.destiny));
  }
  console.timeEnd(route.destiny);
});

Negan.prototype.buildFiles = co.wrap(function* (routes) {
  return yield routes.map(this.buildFile, this);
});
