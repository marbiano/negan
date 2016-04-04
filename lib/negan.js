'use strict';

var co = require('co');
var path = require('path');
var tasks = require('./tasks');

exports = module.exports = Negan;

function Negan (directory) {
  if (!(this instanceof Negan)) return new Negan(directory);
  this.directory = directory || '.';
  this.routes = [];
  this.tasks = {
    html    : ['read', 'frontmatter', 'write'],
    css     : ['read', 'write'],
    scss    : ['sass', 'write'],
    default : ['copy']
  };
}

Negan.prototype.on = function(flout, flin, opts) {
  this.routes.push({
    flin: flin,
    flout: path.join(this.directory, flout),
    type: path.extname(flin).substr(1),
    opts: opts
  });
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

Negan.prototype.buildFile = co.wrap(function* (route) {
  var i = 0;
  var routeTasks = this.tasks[route.type] || this.tasks.default;
  while(i < routeTasks.length) {
    yield tasks[routeTasks[i]](route);
    i++;
  }
});
