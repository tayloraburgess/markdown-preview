#!/usr/bin/env node

var fs = require("fs");

const lexerInclude = require("./lexer.js");
console.log(lexerInclude);
const parserInclude = require("./parser.js");
console.log(parserInclude);

function preview() {
	var file = "test.txt";
	fs.readFile(file, (err, data) => {

		if (err) throw err;

		testLexer = new lexerInclude.lexer(data.toString());
		testParser = new parserInclude.parser(testLexer.lex());
		console.log(JSON.stringify(testParser.parse(), null, "   "));
	});
}

preview();