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
				if (this.peek(1) == " ") {
					if (this.peek(2) == " ") {
						if (this.peek(3) == " ") {
							this.advance(4);
							return new token ("4space");
						}
					}
				}
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
		var peekLevel = 0;

		var frontTypes = [ ">", "*", "+", "-", "number", "tab", "4space" ];

		while (frontTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {

			if (this.peekTokenType(peekLevel) == "tab" || this.peekTokenType(peekLevel) == "4space") {
				frontTokens.push( { name: "codeblock", position: peekLevel } );
				break;
			}
			else if (this.peekTokenType(peekLevel) == ">") {
				frontTokens.push( { name: "blockquote", position: peekLevel } );
				peekLevel++;
			}

			var breakBlankLoop = false;
			while (!breakBlankLoop) {
				if (this.peekTokenType(peekLevel) == "space")
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
			console.log(frontTokens);

			if (frontTokens[0].name == "codeblock")
				node.children.push(this.codeBlock(0, frontTokens));

			else if (frontTokens[0].name == "blockquote") {
				var nestCheck = 0;
				for (var i = 0; i < frontTokens.length; i++) {
					if (frontTokens[i].name == "blockquote")
						nestCheck++;
					else
						break;
				}

				node.children.push(this.blockQuote(0, nestCheck, frontTokens));
				if (globalDebug) console.log("'blockquote' rule returned");
			}
		}	
		return node;
	}

	this.codeBlock = function(tokenIndex, frontTokens) {
		if (globalDebug) console.log("'codeBlock' rule called");
		var node = { type: "codeblock", children: [] };
		var breakBlock = false;

		if (this.currentToken.type == "tab")
			this.eat("tab");
		else if (this.currentToken.type == "4space") {
			this.eat("4space");
		}

		node.children.push(this.codeLine());
		if (globalDebug) console.log("'codeLine' rule returned");
		console.log(frontTokens);
		if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
			breakBlock = true;

		while(!breakBlock) {

			var checkFront = true;
			var peekLevel = 0;


			for (var i = 0; i < frontTokens.length; i++) {
				if (this.peekTokenType(peekLevel) == ">" && frontTokens[i].name == "blockquote")
					peekLevel++;
				else if (this.peekTokenType(peekLevel) == "tab" && frontTokens[i].name == "codeblock")
					peekLevel++;
				else if (this.peekTokenType(peekLevel) == "4space" && frontTokens[i].name == "codeblock")
					peekLevel++;
				else {
					checkFront = false;
					break;
				}

				var breakBlankLoop = false;
				while (!breakBlankLoop) {
					if (this.peekTokenType(peekLevel) == "space")
						peekLevel++;
					else
						breakBlankLoop = true;
				}
			}

			if (checkFront) {
				for (var i = 0; i < frontTokens.length; i++) {
					if (this.currentToken.type == ">")
						this.eat(">");
					else if (this.currentToken.type == "tab")
						this.eat("tab");
					else if (this.currentToken.type == "4space")
						this.eat("4space");

					this.blankNoTab();
				}

				node.children.push(this.codeLine());
				if (globalDebug) console.log("'codeLine' rule returned");
			}
			else 
				breakBlock = true;

			if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
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

	this.blockQuote = function(tokenStart, tokenIndex, inputFrontTokens) {
		var frontTokens = inputFrontTokens;
		if (globalDebug) console.log("'blockquote' rule called");
		var node = { type: "blockquote", children: [] };
		if (globalDebug) console.log("'line' rule returned");
		var breakBlock = false;

		console.log(frontTokens);

		while (!breakBlock) {
			var nestCheck = 0;
			var peekLevel = 0;
			this.blankNoTab();
			if (globalDebug) console.log("'blank' rule returned");

			for (var i = tokenStart; i < frontTokens.length; i++) {
				if (frontTokens[i].name == "blockquote")
					nestCheck++;
				else
					break;
			}

			if (nestCheck > tokenIndex) {
				node.children.push(this.blockQuote(tokenStart, nestCheck, frontTokens));
				if (globalDebug) console.log("'blockquote' rule returned");
				frontTokens = this.lineFrontCheck();

				breakBlock = true;
				if (this.currentToken.type == ">")
					breakBlock = false;
			}

			else if (nestCheck < tokenIndex) {
				breakBlock = true;
			}

			else if (nestCheck == tokenIndex) {
				while (this.currentToken.type == ">") {
					this.eat(">");
					this.blankNoTab();
					if (globalDebug) console.log("'blankNoTab' rule returned");
				}

				if (this.currentToken.type == "tab" || this.currentToken.type == "4space") {
					node.children.push(this.codeBlock(nestCheck + 1, frontTokens));
					frontTokens = this.lineFrontCheck();
					if (globalDebug) console.log("'codeblock' rule returned");
				}
				else {
					node.children.push(this.line());
					if (globalDebug) console.log("'line' rule returned");
					frontTokens = this.lineFrontCheck();
				
					this.blankNoTab();
					if (globalDebug) console.log("'blank' rule returned");
					while (this.currentToken.type != ">" && this.currentToken.type != "newline" && this.currentToken.type != "EOF") {
						node.children.push(this.line());
						if (globalDebug) console.log("'line' rule returned");
						frontTokens = this.lineFrontCheck();
						this.blankNoTab();
						if (globalDebug) console.log("'blank' rule returned");
					}
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

	this.blankNoTab = function() {
		if (globalDebug) console.log("'blankNoTab' rule called");
		if (this.currentToken.type == "space") {
			this.eat("space");
			this.blankNoTab();
			if (globalDebug) console.log("'blankNoTab' rule returned");
		}
	}

	this.blankLine = function() {
		if (globalDebug) console.log("'blankline' rule called");

		if (!(this.currentToken.type == "tab" || this.currentToken.type == "4space")) {
			this.blankNoTab();	
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