Negan = require('../index.js');

app = Negan('_build');

app
	// .on('/', 'templates/index.html', {layout: 'layouts/default.html'})
	.on('/about', 'templates/about.html')
  .on('/blog', 'templates/blog.html')
	.build();
