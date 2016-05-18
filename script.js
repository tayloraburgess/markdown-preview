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
			var strongCount = 0;

			for (i = 0; i < fileText.length; i++) {

				var thisChar = fileText.charAt(i);

				if (thisChar != "\\") {

					if (thisChar ==  "*" | thisChar == "_") {

						if (fileText.charAt(i - 1) != thisChar && fileText.charAt(i + 1) != thisChar) {

							if (boldCount) {
								htmlText+= "</em>";
								boldCount = 0;
							}
							else {
								htmlText += "<em>";
								boldCount = 1;
							}
						}
						else if (fileText.charAt(i - 1) == thisChar) {

							if (fileText.charAt(i - 2) == thisChar) {

								if (strongCount && boldCount) {
									htmlText+= "</strong></em>";
									strongCount = 0;
									boldCount = 0;
								}
								else {
									htmlText += "<strong><em>";
									strongCount = 1;
									boldCount = 1;
								}

							}

							else if (fileText.charAt(i + 1) != thisChar) {

								if (strongCount) {
									htmlText+= "</strong>";
									strongCount = 0;
								}
								else {
									htmlText += "<strong>";
									strongCount = 1;
								}
							}
						}
					}

					else if (fileText.charAt(i) == "\n") htmlText += "<br>";

					else htmlText += fileText.charAt(i);

				}

				else {
					i++;
					htmlText += fileText.charAt(i);

				}

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
