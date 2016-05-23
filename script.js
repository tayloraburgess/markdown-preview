#!/usr/bin/env node

var fs = require("fs");
var http = require("http");
var program = require("commander");

function emphasis (inputText, checkChar, charIndex) {

	var charBack = inputText.charAt(charIndex - 1);
	var charFwd = inputText.charAt(charIndex + 1);
	var charBackBack = inputText.charAt(charIndex - 2);
	var charFwdFwd = inputText.charAt(charIndex + 2);

	if (charBack != checkChar && charFwd != checkChar || charFwdFwd == checkChar) return {type: "em"};
	else if (charBack == checkChar && charBackBack != checkChar) return {type: "strong"};

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

				return {type: "h" + whichHeader};
		}
	}
	else return {type: "text", content: "#"};
}

var generatePreview = (file) => {

	var server = http.createServer( (request, response) => {

		fs.readFile(file, (err, data) => {

			if (err) throw err;

			var fileText = data.toString();
			var htmlObjs = [];
			var lineSplitObjs = [];
			lineSplitObjs.push([]);
			var htmlText = [];

			for (i = 0; i < fileText.length; i++) {

				var thisChar = fileText.charAt(i);

				if (thisChar != "\\") {

					if (thisChar == "*" | thisChar == "_") {
						var addObj = emphasis(fileText, thisChar, i);
					}
					else if (thisChar == "#") {
						var addObj = header(fileText, i);
					}
					else if (fileText.charAt(i) == "\n") var addObj = {type: "newline"};
					else var addObj = ({type: "text", content: fileText.charAt(i)});

				}

				else {

					i++;
					var addObj = {type: "text", content: fileText.charAt(i)};

				}

				if (addObj) {
					if (htmlObjs.length > 0) {
						if (addObj.type == "text" && htmlObjs[htmlObjs.length - 1].type == "text") {
							htmlObjs[htmlObjs.length - 1].content += addObj.content;
						}
						else htmlObjs.push(addObj);
					}
					else htmlObjs.push(addObj);
				}
			}

			for (j = 0; j < htmlObjs.length; j++) {
				if (htmlObjs[j].type == "newline") {
					lineSplitObjs.push([]);
				}
				else lineSplitObjs[lineSplitObjs.length - 1].push(htmlObjs[j]);
			}

			var emCount = 0;
			var strongCount = 0;
			var currentH = "";

			for (i = 0; i < lineSplitObjs.length; i++) {
				htmlText.push("");
				for (j = 0; j < lineSplitObjs[i].length; j++) {

					if (lineSplitObjs[i][j].type == "text") htmlText[i] += lineSplitObjs[i][j].content;

					if (lineSplitObjs[i][j].type == "em") {
						if (emCount) {
							htmlText[i] += "</em>";
							emCount = 0;
						}
						else {
							htmlText[i] += "<em>";
							emCount = 1;
						}
					}

					if (lineSplitObjs[i][j].type == "strong") {
						if (strongCount) {
							htmlText[i] += "</strong>";
							strongCount = 0;
						}
						else {
							htmlText[i] += "<strong>";
							strongCount = 1;
						}
					}

					if (/h./.test(lineSplitObjs[i][j].type)) {
						currentH = lineSplitObjs[i][j].type;
						htmlText[i] += "<" + currentH + ">";
					}

					if (j == (lineSplitObjs[i].length - 1)) {
						if (currentH) {
							htmlText[i] += "</" + currentH + ">";
							currentH = "";
						}
					}

				}
			}

			var htmlOut = "";
			for (i = 0; i < htmlText.length; i++) htmlOut += htmlText[i];

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(htmlOut);
			//console.log(htmlOut);
			//console.log(lineSplitObjs);

		});

	}).listen(8080);

}

program
	.version("1.0.0")
	.usage("<file...>")
	.action(generatePreview);

program.parse(process.argv);