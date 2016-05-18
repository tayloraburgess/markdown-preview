#!/usr/bin/env node

var fs = require("fs");
var http = require("http");
var program = require("commander");

var generatePreview = (file) => {

	var server = http.createServer( (request, response) => {

		fs.readFile(file, (err, data) => {

			if (err) throw err;

			var fileText = data.toString();
			var textLines = fileText.split("\n");

			for (i = 0; i < textLines.length; i++) {
				textLines[i] += "<br>";
			}

			var htmlDisplay = textLines.join("");

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(htmlDisplay);

		});

	}).listen(8080);

}

program
	.version("1.0.0")
	.usage("<file...>")
	.action(generatePreview)

program.parse(process.argv)
