#!/usr/bin/env node

var fs = require("fs");
var globalDebug = true;

function token(initType, initValue) {
	this.type = initType;
	if (initValue != null)
		this.value = initValue;
}

function lexer(inputText) {
	this.position = 0;
	this.text = inputText;
	this.currentChar = this.text[this.position];

	this.digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

	this.error = function(invalid) {
		throw "Invalid character: " + invalid;
	}

	this.advance = function (movePos) {
		this.position += movePos;
		if (this.position > this.text.length - 1)
			this.currentChar = null;
		else
			this.currentChar = this.text[this.position];						
	}

	this.peek = function (movePos) {
		var peekPos = this.position + movePos;
		if (peekPos > this.text.length - 1 || peekPos < 0)
			return null;
		else
			return this.text[peekPos];
	}

	this.getNextToken = function() {
		while (this.currentChar != null) {

			if (this.currentChar in this.digits) {
				this.advance(1);
				return this.checkInt(this.peek(-1));
			}
			else if (this.currentChar == " ") {
				this.advance(1);
				return new token("space");
			}
			else if (this.currentChar == "\n") {
				this.advance(1);
				return new token("newline");
			}
			else if (this.currentChar == "\t") {
				this.advance(1);
				return new token("tab");
			}
			else if (this.currentChar == "=") {
				this.advance(1);
				return new token("=");
			}
			else if (this.currentChar == "-") {
				this.advance(1);
				return new token("-");
			}
			else if (this.currentChar == "_") {
				this.advance(1);
				return new token("_");
			}
			else if (this.currentChar == "#") {
				this.advance(1);
				return new token("#");
			}
			else if (this.currentChar == ">") {
				this.advance(1);
				return new token(">");
			}
			else if (this.currentChar == "<") {
				this.advance(1);
				return new token("<");
			}
			else if (this.currentChar == "*") {
				this.advance(1);
				return new token("*");
			}
			else if (this.currentChar == "+") {
				this.advance(1);
				return new token("+");
			}
			else if (this.currentChar == "=") {
				this.advance(1);
				return new token("=");
			}
			else if (this.currentChar == ".") {
				this.advance(1);
				return new token(".");
			}
			else if (this.currentChar == "[") {
				this.advance(1);
				return new token("[");
			}
			else if (this.currentChar == "]") {
				this.advance(1);
				return new token("]");
			}
			else if (this.currentChar == "(") {
				this.advance(1);
				return new token("(");
			}
			else if (this.currentChar == ")") {
				this.advance(1);
				return new token(")");
			}
			else if (this.currentChar == ":") {
				this.advance(1);
				return new token(":");
			}
			else if (this.currentChar == "`") {
				this.advance(1);
				return new token("`");
			}
			else if (this.currentChar == "!") {
				this.advance(1);
				return new token("!");
			}
			else {
				this.advance(1);
				return new token("plaintext", this.peek(-1));
			}
			this.error(this.currentChar);
		}
		return new token("EOF", null);
	}

	this.checkInt = function(intString) {
		if (!(this.peek(1) in this.digits)) {
			this.advance(1);
			return new token("number", intString);
		}
		else {
			var passString = intString += this.currentChar;
			this.advance(1);
			return this.checkInt(passString);
		}
	}

	this.lex = function() {
		var tokenArray = [];
		var nextToken = this.getNextToken();
		tokenArray.push(nextToken);
		while (nextToken.type != "EOF") {
			nextToken = this.getNextToken();
			tokenArray.push(nextToken);
		}
		return tokenArray;
	}
}

function parser(inputArray) {
	this.tokenArray = inputArray;
	this.position = 0;

	this.error = function() {
		throw "Invalid syntax";
	}

	this.getNextToken = function() {
		this.position++;
		return this.tokenArray[this.position - 1];
	}

	this.currentToken = this.getNextToken();

	this.eat = function(tokenType) {
		if (this.currentToken.type == tokenType)
			this.currentToken = this.getNextToken();
		else
			this.error();
	}

	this.peekTokenType = function(advancePosition) {
		if (this.position + (advancePosition - 1) < this.tokenArray.length)
			return this.tokenArray[this.position + (advancePosition - 1)].type;

		else
			return null;
	}

	this.lineFrontCheck = function() {
		var frontTokens = [];

		// check for code block at beginning of line--either a single tab or three spaces
		var codeCheck = false;
		if (this.currentToken.type == "tab") {
			codeCheck = true;
		}
		else {
			var i;
			for (i = 1; i < 5; i++) {
				if (this.peekTokenType(i) != "space")
					break;
			}
			if (i == 4)
				codeCheck = true;
		}

		// if there's a code block, return just that token--no other block types can be nested in it
		if (codeCheck) {
			frontTokens.push( { name: "codeblock", position: i } );
			return frontTokens;
		}

		// loop through blank tokens (tabs & spaces)
		var peekLevel = 0;
		var breakBlankLoop = false;
		while (!breakBlankLoop) {
			if (this.peekTokenType(peekLevel) == "space")
				peekLevel++;
			else if (this.peekTokenType(peekLevel) == "tab")
				peekLevel++;
			else
				breakBlankLoop = true;
		}

		// check if the current token indicates a block, and loop until there are no more block-level tokens
		var frontTypes = [ ">", "*", "+", "-", "number" ];

		// if returned index is -1, the current token isn't in the "frontTypes" array, so break the loop
		while (frontTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {

			// if there's a ">" token, a blockquote starts, so push the appropriate token to the array that will return
			if (this.peekTokenType(peekLevel) == ">") {
				frontTokens.push( { name: "blockquote", position: peekLevel } );
				peekLevel++;
			}

			// loop through blank tokens (tabs & spaces)
			var breakBlankLoop = false;
			while (!breakBlankLoop) {
				if (this.peekTokenType(peekLevel) == "space")
					peekLevel++;
				else if (this.peekTokenType(peekLevel) == "tab")
					peekLevel++;
				else
					breakBlankLoop = true;
			}
		}
		return frontTokens;
	}

	this.checkFrontTokensFromFirst = function(frontTokens, type) {
		for (var i = 0; i < frontTokens.length; i++) {
			if (frontTokens[i].name == type)
				return frontTokens[i];
		}
		return false;
	}

	this.checkFrontTokensFromLast = function(frontTokens, type) {
		for (var i = frontTokens.length - 1; i > -1; i--) {
			if (frontTokens[i].name == type)
				return frontTokens[i];
		}
		return false;
	}

	this.blocks = function() {
		if (globalDebug) console.log("'blocks' rule called");
		var node = { type: "blocks", children: [] };
		while (this.currentToken.type != "EOF") {
			this.blankLine();
			if (globalDebug) console.log("'blankLine' rule returned");

			var frontTokens = this.lineFrontCheck();

			if (frontTokens[0].name == "codeblock")
				node.children.push(this.codeBlock());

			else if (frontTokens[0].name == "blockquote") {
				var blockQuoteLevel = 0;
				for (var i = 0; i < frontTokens.length; i++) {
					if (frontTokens[i].name == "blockquote")
						blockQuoteLevel++;
				}
				node.children.push(this.blockQuote(blockQuoteLevel, frontTokens));
				if (globalDebug) console.log("'blockquote' rule returned");
			}
		}	
		return node;
	}

	this.codeBlock = function() {
		var node = { type: "codeblock", children: [] };
		var breakBlock = false;
		while(!breakBlock) {
			var codeBlockType = 0;
			if (this.currentToken.type == "tab")
				codeBlockType = 1;
			else {
				var j;
				for (j = 1; j < 5; j++) {
					if (this.peekTokenType(j) != "space")
						break;
				}
				if (j == 4)
					codeBlockType = 2;
			}

			if (codeBlockType > 0) {
				if (codeBlockType == 1)
					this.eat("tab");
				else if (codeBlockType == 2) {
					var i;
					for (i = 0; i < 4; i++)
						this.eat("space");
				}

				node.children.push(this.codeLine());
			}
			else
				breakBlock = true;
		}
		return node;
	}

	this.codeLine = function() {
		if (globalDebug) console.log("'codeLine' rule called");
		var node = { type: "codeline", children: [] };
		while (this.currentToken.type != "newline" && this.currentToken.type != "EOF") {

			if (this.currentToken.type == "space")
				node.children.push(" ");
			else if (this.currentToken.type == "tab")
				node.children.push("	");
			else if (this.currentToken.type == "plaintext" || this.currentToken.type == "number")
				node.children.push(this.currentToken.value);
			else
				node.children.push(this.currentToken.type);

			this.currentToken = this.getNextToken();
		}
		if (this.currentToken.type == "newline")
			this.eat("newline");
		return node;
	}

	this.blockQuote = function(nestLevel, inputFrontTokens) {
		var frontTokens = inputFrontTokens;
		if (globalDebug) console.log("'blockquote' rule called");
		var node = { type: "blockquote", children: [] };
		if (globalDebug) console.log("'line' rule returned");
		var breakBlock = false;

		while (!breakBlock) {
			var nestCheck = 0;
			var peekLevel = 0;
			this.blank();
			if (globalDebug) console.log("'blank' rule returned");

			for (var i = 0; i < frontTokens.length; i++) {
				if (frontTokens[i].name == "blockquote")
					nestCheck++;
			}
			console.log("Nest Level: ", nestLevel);
			console.log("Quote Level: ", nestCheck);

			if (nestCheck > nestLevel) {
				node.children.push(this.blockQuote(nestCheck, frontTokens));
				if (globalDebug) console.log("'blockquote' rule returned");
				frontTokens = this.lineFrontCheck();

				breakBlock = true;
				if (this.currentToken.type == ">")
					breakBlock = false;
			}

			else if (nestCheck < nestLevel) {
				breakBlock = true;
			}

			else if (nestCheck == nestLevel) {
				while (this.currentToken.type == ">") {
					this.eat(">");
					this.blank();
					if (globalDebug) console.log("'blank' rule returned");
				}

				node.children.push(this.line());
				if (globalDebug) console.log("'line' rule returned");
				frontTokens = this.lineFrontCheck();
				console.log(frontTokens);
				this.blank();
				if (globalDebug) console.log("'blank' rule returned");
				while (this.currentToken.type != ">" && this.currentToken.type != "newline" && this.currentToken.type != "EOF") {
					node.children.push(this.line());
					if (globalDebug) console.log("'line' rule returned");
					frontTokens = this.lineFrontCheck();
					console.log(frontTokens);
					this.blank();
					if (globalDebug) console.log("'blank' rule returned");
				}

				if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
					breakBlock = true;
				if (this.currentToken.type == ">")
					breakBlock = false;	
			}
		}
		return node;
	}

	this.blank = function() {
		if (globalDebug) console.log("'blank' rule called");
		if (this.currentToken.type == "space") {
			this.eat("space");
			this.blank();
			if (globalDebug) console.log("'blank' rule returned");
		}
		if (this.currentToken.type == "tab") {
			this.eat("tab");
			this.blank();
			if (globalDebug) console.log("'blank' rule returned");
		}
	}

	this.blankLine = function() {
		if (globalDebug) console.log("'blankline' rule called");

		var codeCheck = false;
		if (this.currentToken.type == "tab")
			codeCheck = true;
		else {
			var i;
			for (i = 0; i < 3; i++) {
				if (this.peekTokenType(i) != "space")
					break;
			}
			if (i == 3)
				codeCheck = true;
		}

		if (!codeCheck) {
			this.blank();
			if (globalDebug) console.log("'blank' rule returned");
			if (this.currentToken.type == "newline") {
				this.eat("newline");
				this.blankLine();
				if (globalDebug) console.log("'blankline' rule returned");
			}
		}
	}

	this.line = function() {
		if (globalDebug) console.log("'line' rule called");
		var node = { type: "line", children: [] };
		while (this.currentToken.type != "newline" && this.currentToken.type != "EOF") {

			if (this.currentToken.type == "space")
				node.children.push(" ");
			else if (this.currentToken.type == "tab")
				node.children.push("	");
			else if (this.currentToken.type == "plaintext" || this.currentToken.type == "number")
				node.children.push(this.currentToken.value);
			else
				node.children.push(this.currentToken.type);

			this.currentToken = this.getNextToken();
		}
		if (this.currentToken.type == "newline")
			this.eat("newline");
		return node;
	}

	this.parse = function() {
		var node = this.blocks();

		if (this.currentToken.type != "EOF")
			this.error();

		return node;
	}
}

function preview() {
	var file = "test.txt";
	fs.readFile(file, (err, data) => {

		if (err) throw err;

		testLexer = new lexer(data.toString());
		testParser = new parser(testLexer.lex());
		console.log(JSON.stringify(testParser.parse(), null, "   "));
	});
}

preview();