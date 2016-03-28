'use strict';

var co = require('co');
var fs = require('co-fs-plus');
var path = require('path');
var cons = require('consolidate');
var matter = require('gray-matter');
var sass = require('node-sass');
var uglify = require("uglify-js");

exports = module.exports = Negan;

function Negan (directory) {
	if (!(this instanceof Negan)) return new Negan(directory);
  this.directory = directory || '.';
	this.routes = [];
  this.assets = { css: [], js: [], img: [] };
}

Negan.prototype.readFile = co.wrap(function* (path) {
  return yield fs.readFile(path, 'utf-8');
});

Negan.prototype.processFile = co.wrap(function* (file, options) {
  var source = matter(file);
  for (var option in options) {
    source.data[option] = route.options[option];
  }
  var content = yield cons.handlebars.render(source.content, {helpers : source.data});
  if (typeof source.data.layout !== 'undefined') {
    content = yield cons.handlebars(source.data.layout, {content: content});
  }
  return content;
});

Negan.prototype.writeFile = co.wrap(function* (dir, content) {
  var dir = yield fs.mkdirp(dir);
  return yield fs.writeFile(path.join(dir.path, 'index.html'), content, 'utf-8');
});


Negan.prototype.buildFile = co.wrap(function* (route) {
  console.time(route.destiny);
  console.log(route.destiny+' started');
  var file = yield this.readFile(route.source);
  var content = yield this.processFile(file, route.options);
  var output = yield this.writeFile(path.join(this.directory, route.destiny), content);
  console.log(route.destiny+' finished');
  console.timeEnd(route.destiny);
});

Negan.prototype.buildFiles = co.wrap(function* (routes) {
  return yield routes.map(this.buildFile, this);
});


Negan.prototype.buildCSS = function() {
  var that = this;
  fs.readdir('assets/css', function(err, files) {
    if (err) throw err;
    for(var i = 0; i < files.length; i++) {
      if(files[i].charAt(0) !== '_' && fs.statSync('assets/css/'+files[i]).isFile()) {
        var dir = path.join(that.directory, 'css');
        var destiny = path.join(that.directory, 'css', path.basename(files[i], '.scss')) + '.css';
        sass.render({
          file: path.join('assets/css', files[i]),
          outFile: destiny,
        }, function(err, result) {
          if (err) throw err;
          mkdirp(dir, function(err) {
            if (err) throw err;
            fs.writeFile(destiny, result.css, 'utf-8', function(err) {
              if (err) throw err;
            });
          });
        });
      }
    };
  });
}

Negan.prototype.buildJS = function() {
  var that = this;
  var jsFiles = [];
  fs.readdir('assets/js', function(err, files) {
    if (err) throw err;
    for(var i = 0; i < files.length; i++) {
      if(fs.statSync('assets/js/'+files[i]).isFile()) {
        jsFiles.push(path.join('assets/js', files[i]));
      }
    }
    var result = uglify.minify(jsFiles);
    var dir = path.join(that.directory, 'js');
    var destiny = path.join(dir, 'main.js');
    mkdirp(dir, function(err) {
      if (err) throw err;
      fs.writeFile(destiny, result.code, 'utf-8', function(err) {
        if (err) throw err;
      });
    });
  });
}

Negan.prototype.buildIMG = function() {
  var that = this;
  var dir = path.join(that.directory, 'img');
  mkdirp(dir, function(err) {
    if (err) throw err;
    fs.readdir('assets/img', function(err, files) {
      if (err) throw err;
      for(var i = 0; i < files.length; i++) {
        if(fs.statSync('assets/img/'+files[i]).isFile()) {
          fs.createReadStream('assets/img/'+files[i]).pipe(fs.createWriteStream(path.join(dir, files[i])));
        }
      }
    });
  });
}

Negan.prototype.on = function(destiny, source, options) {
  var route = {destiny: destiny, source: source, options: options};
	this.routes.push(route);
	return this;
}

Negan.prototype.copy = function(asset) {
  var dir = path.join(this.directory, path.dirname(asset.destiny));
  var destiny = path.join(this.directory, asset.destiny);
  mkdirp(dir, function(err) {
    if (err) throw err;
    fs.createReadStream(asset.source).pipe(fs.createWriteStream(destiny));
  });
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
