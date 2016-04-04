'use strict';

var co = require('co');
var fs = require('co-fs-extra');
var path = require('path');
var cons = require('consolidate');
var matter = require('gray-matter');
var thunkify = require('thunkify');
var sass = require('node-sass');

sass.render = thunkify(sass.render);

exports = module.exports = Negan;

function Negan (directory) {
	if (!(this instanceof Negan)) return new Negan(directory);
  this.directory = directory || '.';
	this.routes = [];
}

Negan.prototype.on = function(destiny, source, options) {
  var route = {destiny: destiny, source: source, options: options};
  this.routes.push(route);
  return this;
}

Negan.prototype.buildFile = co.wrap(function* (route) {
  var file;
  switch (path.extname(route.source)) {
    case '.html':
      file = yield fs.readFile(route.source, 'utf-8');
      file = matter(file);
      for (var option in route.options) {
        file.data[option] = route.options[option];
      }
      var content = yield cons.handlebars.render(file.content, {helpers : file.data});
      if (typeof file.data.layout !== 'undefined') {
        content = yield cons.handlebars(file.data.layout, {content: content});
      }
      return yield fs.outputFile(path.join(this.directory, route.destiny, 'index.html'), content);
    case '.css':
    case '.scss':
      if(path.extname(route.source) === '.scss') {
        file = yield sass.render({file: route.source});
        file = file.css.toString();
      } else {
        file = yield fs.readFile(route.source, 'utf-8');
      }
      return yield fs.outputFile(path.join(this.directory, route.destiny), file);
    default:
      return yield fs.copy(route.source, path.join(this.directory, route.destiny));
  }
});

Negan.prototype.build = function() {
  console.time("build");
  Promise.all(this.routes.map(this.buildFile, this)).then(
    function() {
      console.timeEnd("build");
    }, function (err) {
      console.error(err.stack);
    }
  );
};
