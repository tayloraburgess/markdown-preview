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

	this.blocks = function() {
		if (globalDebug) console.log("'blocks' rule called");
		var node = { type: "blocks", children: [] };
		while (this.currentToken.type != "EOF") {
			this.blankLine();
			if (globalDebug) console.log("'blankLine' rule returned");

			var codeCheck = false;
			if (this.currentToken.type == "tab")
				codeCheck = true;
			else {
				var i;
				for (i = 1; i < 5; i++) {
					if (this.peekTokenType(i) != "space")
						break;
				}
				if (i == 4)
					codeCheck = true;
			}

			if (codeCheck)
				node.children.push(this.codeBlock());

			else if (this.currentToken.type == ">") {
				var nestCheck = 0;
				var peekLevel = 0;
				while (this.peekTokenType(peekLevel) == ">") {
					peekLevel++;
					breakBlankLoop = false;
					while (!breakBlankLoop) {
						if (this.peekTokenType(peekLevel) == "space")
							peekLevel++;
						else if (this.peekTokenType(peekLevel) == "tab")
							peekLevel++;
						else
							breakBlankLoop = true;
					}
					nestCheck++;
				}	
				node.children.push(this.blockQuote(nestCheck));
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

	this.blockQuote = function(nestLevel) {
		if (globalDebug) console.log("'blockquote' rule called");
		var node = { type: "blockquote", children: [] };
		if (globalDebug) console.log("'line' rule returned");
		var breakBlock = false;

		while (!breakBlock) {
			var nestCheck = 0;
			var peekLevel = 0;
			this.blank();
			if (globalDebug) console.log("'blank' rule returned");
			while (this.peekTokenType(peekLevel) == ">") {
				peekLevel++;
				breakBlankLoop = false;
				while (!breakBlankLoop) {
					if (this.peekTokenType(peekLevel) == "space")
						peekLevel++;
					else if (this.peekTokenType(peekLevel) == "tab")
						peekLevel++;
					else
						breakBlankLoop = true;
				}
				nestCheck++;
			}	
			console.log("Quote Level: ", nestCheck);

			if (nestCheck > nestLevel) {
				node.children.push(this.blockQuote(nestCheck));
				if (globalDebug) console.log("'blockquote' rule returned");

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
				this.blank();
				if (globalDebug) console.log("'blank' rule returned");
				while (this.currentToken.type != ">" && this.currentToken.type != "newline" && this.currentToken.type != "EOF") {
					node.children.push(this.line());
					if (globalDebug) console.log("'line' rule returned");
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