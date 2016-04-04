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
  this.tasks = {
    html    : ['read', 'matter', 'write'],
    css     : ['read', 'write'],
    scss    : ['sass', 'write'],
    default : ['copy']
  };
}

Negan.prototype.on = function(destiny, source, options) {
  var route = {destiny: destiny, source: source, options: options};
  this.routes.push(route);
  return this;
}

Negan.prototype.read = co.wrap(function* (route) {
  route.content = yield fs.readFile(route.source, 'utf-8');
});

Negan.prototype.write = co.wrap(function* (route) {
  var dest =  path.join(this.directory, route.destiny);
  if(path.extname(route.source).substr(1) === 'html') dest = path.join(dest, 'index.html');
  yield fs.outputFile(dest, route.content);
});

Negan.prototype.matter = co.wrap(function* (route) {
  var file = matter(route.content);
  for (var option in route.options) {
    file.data[option] = route.options[option];
  }
  route.content = yield cons.handlebars.render(file.content, {helpers : file.data});
  if (typeof file.data.layout !== 'undefined') {
    route.content = yield cons.handlebars(file.data.layout, {content: route.content});
  }
});

Negan.prototype.copy = co.wrap(function* (route) {
  yield fs.copy(route.source, path.join(this.directory, route.destiny));
});;

Negan.prototype.sass = co.wrap(function* (route) {
  var file = yield sass.render({file: route.source});
  route.content = file.css.toString();
});;

Negan.prototype.buildFile = co.wrap(function* (route) {
  var i = 0;
  var type = path.extname(route.source).substr(1);
  var tasks = this.tasks[type] || this.tasks.default;
  while(i < tasks.length) {
    yield this[tasks[i]](route);
    i++;
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
