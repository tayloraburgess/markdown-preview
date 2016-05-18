#!/usr/bin/env node

var fs = require("fs");
var http = require("http");
var program = require("commander");

String.prototype.insert = function(startIndex, endIndex, subString) {

	var beforeString = this.slice(0, startIndex);
	var afterString = this.slice(endIndex + 1, this.length);
	return beforeString + subString + afterString;
}

String.prototype.replaceChar = function(replaceIndex, replaceCharacter) {

	var beforeString = this.slice(0, replaceIndex);
	var afterString = this.slice(replaceIndex + 1, this.length);
	return beforeString + replaceCharacter + afterString;
}

var generatePreview = (file) => {

	var server = http.createServer( (request, response) => {

		fs.readFile(file, (err, data) => {

			if (err) throw err;

			var fileText = data.toString();
			var htmlText= "";

			var boldCount = 0;
			for (i = 0; i < fileText.length; i++) {
				if (fileText.charAt(i) ==  "*" | fileText.charAt(i) ==  "_") {

					if (boldCount) {
						htmlText+= "</em>";
						boldCount = 0;
					}
					else {
						htmlText += "<em>";
						boldCount = 1;
					}

				}

				else if (fileText.charAt(i) == "\n") htmlText += "<br>";

				else htmlText += fileText.charAt(i);

			}

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(htmlText);

		});

	}).listen(8080);

}

program
	.version("1.0.0")
	.usage("<file...>")
	.action(generatePreview)

program.parse(process.argv)
