#!/usr/bin/env node

var globalDebug = true;

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
		var listTypes = [ "*", "+", "-"]

		while (frontTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {

			if (this.peekTokenType(peekLevel) == "tab" || this.peekTokenType(peekLevel) == "4space") {
				frontTokens.push( { name: "codeblock", position: peekLevel } );
				break;
			}
			else if (this.peekTokenType(peekLevel) == ">") {
				frontTokens.push( { name: "blockquote", position: peekLevel } );
				peekLevel++;
			}
			else if (listTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {
				if (this.peekTokenType(peekLevel + 1) == "tab" || this.peekTokenType(peekLevel + 1) == "space") {
					frontTokens.push( { name: "list", position: peekLevel } );
				}
				peekLevel++;
			}
			else if (this.peekTokenType(peekLevel) ==  "number") {
				if (this.peekTokenType(peekLevel + 1) == ".") {
					if (this.peekTokenType(peekLevel + 2) == "tab" || this.peekTokenType(peekLevel + 2) == "space") {
						frontTokens.push( { name: "orderedlist", position: peekLevel } );
					}
				}
				peekLevel += 2;
			}
			else
				break;

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
/*
	this.checkFrontTokensFromFirst = function(frontTokens, type) {
		for (var i = 0; i < frontTokens.length; i++) {
			if (frontTokens[i].name == type)
				return i;
		}
		return false;
	}

	this.checkFrontTokensFromLast = function(frontTokens, type) {
		for (var i = frontTokens.length - 1; i > -1; i--) {
			if (frontTokens[i].name == type)
				return i;
		}
		return false;
	}
	*/


	this.blocks = function() {
		if (globalDebug) console.log("'blocks' rule called");
		var node = { type: "blocks", children: [] };
		while (this.currentToken.type != "EOF") {
			this.blankLine();
			if (globalDebug) console.log("'blankLine' rule returned");
			var frontTokens = this.lineFrontCheck();

			if (frontTokens[0].name == "codeblock") {
				node.children.push(this.codeBlock(0, frontTokens));
				if (globalDebug) console.log("'codeblock' rule returned");
			}

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

			else if (frontTokens[0].name == "list") {
				node.children.push(this.list(0, frontTokens));
				if (globalDebug) console.log("'list' rule returned");
			}
			else if (frontTokens[0].name == "orderedlist") {
				node.children.push(this.orderedList(0, frontTokens));
				if (globalDebug) console.log("'orderedList' rule returned");
			}
		}	
		return node;
	}

	this.list = function(tokenStart, inputFrontTokens) {
		if (globalDebug) console.log("'list' rule called");
		var frontTokens = inputFrontTokens;
		var node = { type: "list", children: [] };
		breakBlock = false;

		while(!breakBlock) {
			var newFrontTokens = this.lineFrontCheck();
			if (this.compareFront(frontTokens, newFrontTokens)) {
				var pointNode = { type: "point", children: [] };
				this.eatFront(frontTokens);

				pointNode.children.push(this.line());
				if (globalDebug) console.log("'line' rule returned");
				var tempCheck = this.lineFrontCheck();
				console.log(tempCheck.length);

				while (tempCheck.length == 0 && this.currentToken.type != "EOF") {
					pointNode.children.push(this.line());
					if (globalDebug) console.log("'line' rule returned");
					tempCheck = this.lineFrontCheck();
					console.log(tempCheck);
					console.log(tempCheck.length);
				}

				node.children.push(pointNode);				
			}
			else {
				var newFrontTokens = this.lineFrontCheck();
				if (newFrontTokens.length <= frontTokens.length) {
					breakBlock = true;
				}
				else {
					if (frontTokens[tokenStart].name == newFrontTokens[tokenStart].name) {
						frontTokens = newFrontTokens;
						if (frontTokens[tokenStart + 1].name == "list") {
							node.children.push(this.list(tokenStart + 1, frontTokens));
							if (globalDebug) console.log("'list' rule returned");
						}
						else if (frontTokens[tokenStart + 1].name == "orderedlist") {
							node.children.push(this.orderedList(tokenStart + 1, frontTokens));
							if (globalDebug) console.log("'orderedList' rule returned");
						}
						else if (frontTokens[tokenStart + 1].name == "codeblock") {
							node.children.push(this.codeBlock(tokenStart + 1, frontTokens));
							if (globalDebug) console.log("'codeBlock' rule returned");
						}
						else if (frontTokens[tokenStart + 1].name == "blockquote") {
							var nestCheck = 0;
							for (var i = 0; i < frontTokens.length; i++) {
								if (frontTokens[i].name == "blockquote")
									nestCheck++;
								else
									break;
							}
							node.children.push(this.blockQuote(tokenStart + 1, nestCheck, frontTokens));
							if (globalDebug) console.log("'blockquote' rule returned");
						}
					}
					else {
						breakBlock = true;
					}
				}
			}

			if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
				breakBlock = true;
		}
		return node;
	}

	this.orderedList = function(tokenIndex, frontTokens) {

	}

	this.compareFront = function(frontTokens, newFrontTokens) {
		var check = true;
		if (frontTokens.length != newFrontTokens.length)
			check = false;

		else {
			for (var i = 0; i < frontTokens.length; i++) {
				if (frontTokens[i].name != newFrontTokens[i].name)
					check = false;
			}
		}
		return check;
	}

	this.eatFront = function(frontTokens) {
		for (var i = 0; i < frontTokens.length; i++) {
			if (this.currentToken.type == ">")
				this.eat(">");
			else if (this.currentToken.type == "tab")
				this.eat("tab");
			else if (this.currentToken.type == "4space")
				this.eat("4space");
			else if (this.currentToken.type == "number")
				this.eat("number");
			else if (this.currentToken.type == "-")
				this.eat("-");
			else if (this.currentToken.type == "+")
				this.eat("+");
			else if (this.currentToken.type == "*")
				this.eat("*");
			else if (this.currentToken.type == ".")
				this.eat(".");

			this.blankNoTab();
		}
	}

	this.codeBlock = function(tokenIndex, frontTokens) {
		if (globalDebug) console.log("'codeBlock' rule called");
		var node = { type: "codeblock", children: [] };
		var breakBlock = false;

		if (this.currentToken.type == "tab")
			this.eat("tab");
		else if (this.currentToken.type == "4space") {
			this.eat("4space");z
		}

		node.children.push(this.codeLine());
		if (globalDebug) console.log("'codeLine' rule returned");
		if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
			breakBlock = true;

		while(!breakBlock) {

			var newFrontTokens = lineFrontCheck();
			if (compareFront(frontTokens, newFrontTokens)) {
				this.eatFront(frontTokens);	
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
		if (globalDebug) console.log("'blockquote' rule called");
		var frontTokens = inputFrontTokens;
		var node = { type: "blockquote", children: [] };
		var breakBlock = false;

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

module.exports = {
	parser: parser
}