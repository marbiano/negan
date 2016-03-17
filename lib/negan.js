'use strict';

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var matter = require('gray-matter');
var cons = require('consolidate');
var sass = require('node-sass');
var UglifyJS = require("uglify-js");

exports = module.exports = Negan;

function Negan (directory) {
	if (!(this instanceof Negan)) return new Negan(directory);
  this.directory = directory || '.';
	this.routes = [];
  this.assets = { css: [], js: [], img: [] };
}

Negan.prototype.buildRoutes = function() {
  for(var i = 0; i < this.routes.length; i++) {
    (function(index) {
      var destiny = path.join(this.directory, this.routes[index].destiny);
      var options = this.routes[index].options;
      fs.readFile(this.routes[i].source, 'utf-8', function(err, data) {
        if (err) throw err;
        var file = matter(data);
        for (var option in options) {
          file.data[option] = options[option];
        }
        mkdirp(destiny, function(err) {
          if (err) throw err;
          cons.handlebars.render(file.content, {helpers: file.data}, function(err, html) {
            if (err) throw err;
            if (typeof file.data.layout !== 'undefined') {
              cons.handlebars(file.data.layout, {content: html}, function(err, html) {
                if (err) throw err;
                fs.writeFile(path.join(destiny, '/index.html'), html, 'utf-8', function(err) {
                  if (err) throw err;
                });
              });
            } else {
              fs.writeFile(path.join(destiny, '/index.html'), html, 'utf-8', function(err) {
                if (err) throw err;
              });
            }
          });
        });
      });
    }).call(this, i);
  }
}

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
    var result = UglifyJS.minify(jsFiles);
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
  this.buildRoutes();
  this.buildCSS();
  this.buildJS();
  this.buildIMG();
}
