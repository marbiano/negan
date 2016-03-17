Negan = require('../index.js');

app = Negan('_build');

app
	.on('/', 'templates/index.html', {layout: 'layouts/default.html'})
	.on('/blog', 'templates/blog.html')
	.on('/about', 'templates/about.html')
	.build();
