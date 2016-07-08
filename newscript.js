#!/usr/bin/env node

var fs = require("fs");
var http = require("http");
var program = require("commander");

var lexer = (inputText) => {
	// Analyze text; generate tokens
}

var parser = (inputLexer) => {
	// Read tokens; generate AST
}

var interpreter = (inputParser) => {

	var server = http.createServer( (request, response) => {

		fs.readFile(file, (err, data) => {

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(htmlOut);
		});
	}).listen(8080);
}

program
	.version("1.0.0")
	.usage("<file...>")
	.action(interpreter);

program.parse(process.argv);
