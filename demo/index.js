Negan = require('../index.js');

app = Negan('_build');

app
	.on('/', 'templates/index.html', {layout: 'layouts/default.html'})
	.on('/about', 'templates/about.html')
  .on('/blog', 'templates/blog.html')

  .on('/css/main.css', 'assets/css/main.scss')
  .on('/css/static-lol.css', 'assets/css/static.css')
  .on('/js/test.js', 'assets/js/test.js')
  .on('/img/gugui.jpg', 'assets/img/gugui.jpg')

	.build();
