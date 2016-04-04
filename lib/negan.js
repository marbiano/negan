'use strict';

var co = require('co');
var fs = require('co-fs-extra');
var path = require('path');
var cons = require('consolidate');
var matter = require('gray-matter');
var thunkify = require('thunkify');
var sass = require('node-sass');

sass.render = thunkify(sass.render);

var neganTasks = {
  read: co.wrap(function* (route) {
    route.content = yield fs.readFile(route.flin, 'utf-8');
  }),
  write: co.wrap(function* (route) {
    if(route.type === 'html') route.destination = path.join(route.destination, 'index.html');
    yield fs.outputFile(route.destination, route.content);
  }),
  matter: co.wrap(function* (route) {
    var file = matter(route.content);
    for (var option in route.opts) {
      file.data[option] = route.opts[option];
    }
    route.content = yield cons.handlebars.render(file.content, {helpers : file.data});
    if (typeof file.data.layout !== 'undefined') {
      route.content = yield cons.handlebars(file.data.layout, {content: route.content});
    }
  }),
  copy: co.wrap(function* (route) {
    yield fs.copy(route.flin, path.join(route.destination, route.flout));
  }),
  sass: co.wrap(function* (route) {
    var file = yield sass.render({file: route.flin});
    route.content = file.css.toString();
  })
};

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

Negan.prototype.buildFile = co.wrap(function* (route) {
  var i = 0;
  var type = route.type = path.extname(route.flin).substr(1);
  var tasks = this.tasks[type] || this.tasks.default;
  route.destination = path.join(this.directory, route.flout);
  while(i < tasks.length) {
    yield neganTasks[tasks[i]](route);
    i++;
  }
});

Negan.prototype.on = function(flout, flin, opts) {
  this.routes.push({flout: flout, flin: flin, opts: opts});
  return this;
}

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
