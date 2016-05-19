#!/usr/bin/env node

var fs = require("fs");
var http = require("http");
var program = require("commander");

var boldCount = 0;
var strongCount = 0;
var headerCount = 0;

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

function newLine (inputText, charIndex) {

	var htmlReturn = "";

	if (headerCount > 0) {
		htmlReturn += "</h" + headerCount + ">";
		headerCount = 0;
	}
	
	else htmlReturn += "<br>";
	return htmlReturn;
}

function emphasis (inputText, checkChar, charIndex) {

	var returnHtml = "";

	if (inputText.charAt(charIndex - 1) != checkChar && inputText.charAt(charIndex + 1) != checkChar) {

		if (boldCount) {
			returnHtml+= "</em>";
			boldCount = 0;
		}

		else {
			returnHtml += "<em>";
			boldCount = 1;
		}
	}
	else if (inputText.charAt(charIndex - 1) == checkChar) {

		if (inputText.charAt(charIndex - 2) == checkChar) {

			if (strongCount && boldCount) {
				returnHtml+= "</strong></em>";
				strongCount = 0;
				boldCount = 0;
			}

			else {
				returnHtml += "<strong><em>";
				strongCount = 1;
				boldCount = 1;
			}
		}
		else if (inputText.charAt(charIndex + 1) != checkChar) {

			if (strongCount) {
				returnHtml+= "</strong>";
				strongCount = 0;
			}

			else {
				returnHtml += "<strong>";
				strongCount = 1;
			}
		}
	}
	return returnHtml;
}

function header (inputText, charIndex) {

	var whichHeader = 0;
	for (j = 1; j < 7; j++) {
		if (inputText.charAt(charIndex - j) == "\n" || (charIndex - j) < 0) { 
			whichHeader = j;
			break;
		}
	}

	var maxHeader = 0;
	if (inputText.charAt(charIndex + 6 - (whichHeader - 1)) == "#") maxHeader = 1;

	var otherHashes = 0;
	if (whichHeader != 0) {

		for (j = whichHeader - 1; j > 0; j--) {
			if (inputText.charAt(charIndex - j) != "#") otherHashes = 1;
		}
	}

	if (whichHeader > 0 && otherHashes == 0 && maxHeader == 0) {
		if (inputText.charAt(charIndex + 1) != "#") {

				headerCount = whichHeader;
				return "<h" + whichHeader + ">";
		}
		else return "";
	}
	else return "#";
}

var generatePreview = (file) => {

	var server = http.createServer( (request, response) => {

		fs.readFile(file, (err, data) => {

			if (err) throw err;

			var fileText = data.toString();
			var htmlText= "";

			for (i = 0; i < fileText.length; i++) {

				var thisChar = fileText.charAt(i);

				if (thisChar != "\\") {

					if (thisChar == "*" | thisChar == "_") htmlText += emphasis(fileText, thisChar, i);
					else if (thisChar == "#") htmlText += header(fileText, i);
					else if (fileText.charAt(i) == "\n") htmlText += newLine(fileText, i);
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
	.action(generatePreview);

program.parse(process.argv);