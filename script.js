#!/usr/bin/env node

var fs = require("fs");
var http = require("http");
var program = require("commander");

function emphasis(inputText, checkChar, charIndex) {

	var charBack = inputText.charAt(charIndex - 1);
	var charFwd = inputText.charAt(charIndex + 1);
	var charBackBack = inputText.charAt(charIndex - 2);
	var charFwdFwd = inputText.charAt(charIndex + 2);

	if (charBack != checkChar && charFwd != checkChar || charFwdFwd == checkChar) return {type: "em"};
	else if (charBack == checkChar && charBackBack != checkChar) return {type: "strong"};

}

function setextHeader(inputText, checkChar, charIndex) {

	var isHeader = 0;

	for (j = charIndex + 1; j < inputText.length; j++) {

		if (inputText.charAt(j) == "\n") break;
		else if (inputText.charAt(j) != checkChar) isHeader = 1;
	}

	for (j = charIndex - 1; j > -1; j--) {

		if (inputText.charAt(j) == "\n") break;
		else if (inputText.charAt(j) != checkChar) isHeader = 1;
	}

	if (inputText.charAt(charIndex - 1) == "\n") {

		if (!isHeader) {
			if (checkChar == "=") return {type: "setext1"};
			else if (checkChar == "-") return {type: "setext2"};
		}

		else return {type: "text", content: checkChar};
	} else {
		if(isHeader) return {type: "text", content: checkChar};
	}

}

function atxHeader(inputText, charIndex) {

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

function space(inputText, charIndex) {

	var spacesAfterCharIndex = 0;

	for (j = charIndex + 1; j < inputText.length; j++) {
		if (inputText.charAt(j) == "\n") break;
		else {
			if (inputText.charAt(j) != " ") spacesAfterCharIndex = 1; 
		}
	}

	if (!spacesAfterCharIndex)  {
		if (inputText.charAt(charIndex + 1) != "\n") {
			if (inputText.charAt(charIndex - 1) != " ") return {type: "br"};
		}
		else if (inputText.charAt(charIndex - 1) != " ") {
			return {type: "text", content: " "};
		}
	}

	else return {type: "text", content: " "};
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
						var addObj = atxHeader(fileText, i);
					}
					else if (thisChar == "-" | thisChar == "=") {
						var addObj = setextHeader(fileText, thisChar, i);
					}
					else if (thisChar == " ") {
						var addObj = space(fileText, i); 
					}
					else if (fileText.charAt(i) == "\n") {
						var addObj = {type: "newline"};
					}

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

			var newlineIDs = [];
			newlineIDs.push(-1);
			for (j = 0; j < htmlObjs.length; j++) {
				if (htmlObjs[j].type == "newline") newlineIDs.push(j);
			}

			var breakIDs = [];
			for (j = 0; j < newlineIDs.length; j++) {
				var shouldBreak = 0;

				if (htmlObjs[newlineIDs[j] - 1]) {
					// Need to implement a way for code to account for a line with only one space--should break the line, but currently doesn't
					if (htmlObjs[newlineIDs[j] - 1].type == "newline") shouldBreak = 1;
					if (htmlObjs[newlineIDs[j] - 1].type == "br") shouldBreak = 1;
					if (/setext./.test(htmlObjs[newlineIDs[j] - 1].type)) shouldBreak = 1;
				}
				if (htmlObjs[newlineIDs[j - 1] + 1]) {
					if (/h./.test(htmlObjs[newlineIDs[j - 1] + 1].type)) shouldBreak = 1;
				}
				if (htmlObjs[newlineIDs[j] + 1]) {
					if (/h./.test(htmlObjs[newlineIDs[j] + 1].type)) shouldBreak = 1;
				}
				if (htmlObjs[newlineIDs[j + 2] - 1]) {
					if (/setext./.test(htmlObjs[newlineIDs[j + 2] - 1].type)) shouldBreak = 1;
				}

				if (shouldBreak) breakIDs.push(newlineIDs[j]);
			}

			for (j = 0; j < htmlObjs.length; j++) {
				if (breakIDs.indexOf(j) > -1) lineSplitObjs.push([]);
				else if (htmlObjs[j].type != "newline") lineSplitObjs[lineSplitObjs.length - 1].push(htmlObjs[j]);
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

					if (lineSplitObjs[i][j].type == "setext1") {
						htmlText[i] = "<h1>" + htmlText[i];
						htmlText[i] += "</h1>";

					}

					if (lineSplitObjs[i][j].type == "setext2") {
						htmlText[i] = "<h2>" + htmlText[i];
						htmlText[i] += "</h2>";z
					}

					if (lineSplitObjs[i][j].type == "br") {
						htmlText[i] += "<br>";
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

			//console.log(lineSplitObjs);

			var htmlOut = "";
			for (i = 0; i < htmlText.length; i++) htmlOut += htmlText[i];

			response.writeHead(200, {'Content-Type': 'text/html'});
			response.end(htmlOut);
			//console.log(htmlOut);

		});

	}).listen(8080);

}

program
	.version("1.0.0")
	.usage("<file...>")
	.action(generatePreview);

program.parse(process.argv);