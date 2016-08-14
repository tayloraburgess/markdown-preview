#!/usr/bin/env node

var fs = require("fs");

const lexerInclude = require("./lexer.js");
const parserInclude = require("./parser.js");

function preview() {
	// Replace with file to be interpreted
	var file = "test.txt";
	fs.readFile(file, (err, data) => {

		if (err) throw err;

		testLexer = new lexerInclude.lexer(data.toString());
		testParser = new parserInclude.parser(testLexer.lex());
		console.log(JSON.stringify(testParser.parse(), null, "   "));
		//console.log(JSON.stringify(testParser.lineFrontCheck(), null, "   "));
	});
}

preview();