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

	this.peekSpaces = function(peekLevel) {
		var breakBlankLoop = false;
		var returnPeekLevel = 0;
		while (!breakBlankLoop) {
			if (this.peekTokenType(peekLevel + returnPeekLevel) == "space") {
				returnPeekLevel++;
			}
			else
				breakBlankLoop = true;
		}
		return returnPeekLevel;
	}

	this.peekBlankLines = function(compareTokens, numberLines) {
		var peekLevel = 0;
		var returnValue = true;
		
			for (var i = 0; i < numberLines; i++) {
				var sigTokens = 0;;
				for (var j = 0; j < compareTokens.length; j++) {
					if (compareTokens[j].name == "blockquote") {
						sigTokens++;
					}
				}

				var compareSigTokens = 0;
				while (this.peekTokenType(peekLevel) == "space" || this.peekTokenType(peekLevel) == "tab" || this.peekTokenType(peekLevel) == ">") {
					if (this.peekTokenType(peekLevel) == ">") {
						compareSigTokens++;
					}
					peekLevel++;
				}

				if (compareSigTokens != sigTokens) {
					returnValue = false;
					break;
				}

				if (this.peekTokenType(peekLevel) != "newline") {
					returnValue = false;
					break;
				}
				else
					peekLevel++;
			}
			return returnValue;
	}

	this.lineFrontCheck = function() {
		var frontTokens = [];
		var peekLevel = 0;
		var oneList = false;

		var frontTypes = [ ">", "*", "+", "-", "number", "tab" ];
		var listTypes = [ "*", "+", "-"];

		peekLevel += this.peekSpaces(peekLevel);

		while (frontTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {

			if (this.peekTokenType(peekLevel) == "tab") {
				frontTokens.push( { name: "tab", position: peekLevel } );
				peekLevel++;
			}
			else if (this.peekTokenType(peekLevel) == ">") {
				frontTokens.push( { name: "blockquote", position: peekLevel } );
				peekLevel++;
			}
			else if (listTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {
				if (oneList)
					break;
				else {
					if (this.peekTokenType(peekLevel + 1) == "tab" || this.peekTokenType(peekLevel + 1) == "space") {
						frontTokens.push( { name: "list", position: peekLevel } );
						oneList = true;
						peekLevel += 2;
					}
					else
						break;
				}
			}
			else if (this.peekTokenType(peekLevel) ==  "number") {
				if (oneList)
					break;
				else {
					if (this.peekTokenType(peekLevel + 1) == ".") {
						if (this.peekTokenType(peekLevel + 2) == "tab" || this.peekTokenType(peekLevel + 2) == "space") {
							frontTokens.push( { name: "orderedlist", position: peekLevel } );
							oneList = true;
							peekLevel += 3;
						}
						else
							break;
					}
					else
						break;
				}
			}
			else
				break;

			peekLevel += this.peekSpaces(peekLevel);
		}
		return frontTokens;
	}

	this.blocks = function() {
		if (globalDebug) console.log("'blocks' rule called");
		var node = { type: "blocks", children: [] };
		while (this.currentToken.type != "EOF") {
			this.blankLine();
			if (globalDebug) console.log("'blankLine' rule returned");
			var frontTokens = this.lineFrontCheck();

			if (frontTokens[0].name == "tab") {
				node.children.push(this.codeBlock(0, frontTokens));
				if (globalDebug) console.log("'codeBlock' rule returned");
			}

			else if (frontTokens[0].name == "blockquote") {
				var nestCheck = 0;
				for (var i = 1; i < frontTokens.length; i++) {
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
		var breakBlock = false;


		while(!breakBlock) {
			var newFrontTokens = this.lineFrontCheck();
			if (this.compareFront(frontTokens, newFrontTokens)) {
				var pointNode = { type: "point", children: [] };
				var pointHolder = [];
				var paragraphs = false;
				var newParagraph = false;
				var failedParagraph = false;
				this.eatFront(frontTokens);

				this.blank();
				if (globalDebug) console.log("'blank' rule returned");

				pointHolder.push(this.line());
				if (globalDebug) console.log("'line' rule returned");
				var tempCheck = this.lineFrontCheck();
				var breakLoop = false;

				while (!breakLoop) {

					if (this.peekBlankLines(newFrontTokens, 2))
						breakLoop = true;

					else if (this.peekBlankLines(newFrontTokens, 1) && !this.peekBlankLines(newFrontTokens, 2)) {

						this.blankLine();
						if (globalDebug) console.log("'blankLine' rule returned");
						var tempCheck = this.lineFrontCheck();
						if (tempCheck.length >= newFrontTokens.length) {
							if (tempCheck[tokenStart].name == "tab" && !failedParagraph) {
								paragraphs = true;
								newParagraph = true;

								var tempParagraph = { type: "paragraph", children: [] };

								for (var i = 0; i < pointHolder.length; i++)
									tempParagraph.children.push(pointHolder[i]);

								pointNode.children.push(tempParagraph);
								pointHolder = [];
								tempCheck = this.lineFrontCheck();
							}
							else {
								tempCheck = this.lineFrontCheck();
								failedParagraph = true;
							}
						}
						else {
								tempCheck = this.lineFrontCheck();
								failedParagraph = true;
						}
					}

					else if (tempCheck.length == newFrontTokens.length - 1) {
						for (var i = 0; i < tempCheck.length; i++) {
							if (tempCheck[i].name != newFrontTokens[i].name) {
								breakLoop = true;
								break;
							}
						}
						if (!breakLoop) {
							this.eatFront(tempCheck);

							pointHolder.push(this.line());
							if (globalDebug) console.log("'line' rule returned");
							tempCheck = this.lineFrontCheck();
						}
					}

					else if (tempCheck.length >= newFrontTokens.length) {
						for (var i = 0; i < tokenStart; i++) {
							if (tempCheck[i].name != newFrontTokens[i].name) {
								breakLoop = true;
								break;
							}
						}
						if (!breakLoop && tempCheck[tokenStart].name == "tab") {
							if (tempCheck.length > newFrontTokens.length) {
								if (tempCheck[tokenStart + 1].name == "tab") {
									pointHolder.push(this.codeBlock(tokenStart + 2, tempCheck));
									if (globalDebug) console.log("'codeBlock' rule returned");
								}
								else if (tempCheck[tokenStart + 1].name == "list") {
									pointHolder.push(this.list(tokenStart + 1, tempCheck));
									if (globalDebug) console.log("'list' rule returned");
								}
								else if (tempCheck[tokenStart + 1].name == "orderedlist") {
									pointHolder.push(this.orderedList(tokenStart + 1, tempCheck));
									if (globalDebug) console.log("'orderedList' rule returned");
								}
								else if (tempCheck[tokenStart + 1].name == "blockquote") {
									var nestCheck = 0;
									for (var i = 0; i < tempCheck.length; i++) {
										if (tempCheck[i].name == "blockquote")
											nestCheck++;
										else
											break;
									}
									pointHolder.push(this.blockQuote(tokenStart + 1, nestCheck, tempCheck));
									if (globalDebug) console.log("'blockquote' rule returned");
								}
								tempCheck = this.lineFrontCheck();
							}
							else if (newParagraph) {
								newParagraph = false;
								this.eatFront(tempCheck);
								pointHolder.push(this.line());
								if (globalDebug) console.log("'line' rule returned");
								tempCheck = this.lineFrontCheck();
							}
							else {
								this.eatFront(tempCheck);
								pointHolder.push(this.line());
								if (globalDebug) console.log("'line' rule returned");
								tempCheck = this.lineFrontCheck();
							}
						}
						else {
							breakLoop = true;
						}

					}
					else {
						breakLoop = true;
					}


					if (this.currentToken.type == "EOF")
						breakLoop = true;
				}

				if (paragraphs) {
					var tempParagraph = { type: "paragraph", children: [] };
					for (var i = 0; i < pointHolder.length; i++)
						tempParagraph.children.push(pointHolder[i]);

					pointNode.children.push(tempParagraph);
				}
				else {
					for (var i = 0; i < pointHolder.length; i++)
						pointNode.children.push(pointHolder[i]);
				}

				node.children.push(pointNode);				
			}
			else {
				breakBlock = true;
			}

			if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
				breakBlock = true;
		}
		return node;
	}

	this.orderedList = function(tokenStart, inputfrontTokens) {

	}

	this.compareFront = function(frontTokens, newFrontTokens) {
		var check = true;

		if (newFrontTokens.length != frontTokens.length)
			check = false;
		else {
			for (var i = 0; i < frontTokens.length; i++) {
				if (frontTokens[i].name != newFrontTokens[i].name)
					check = false;
			}
		}

		return check;
	}

	this.eatFront = function(frontTokens, eatLength) {
		if (eatLength == undefined)
			var eatLength = frontTokens.length;

		for (var i = 0; i < eatLength; i++) {
			if (this.currentToken.type == ">")
				this.eat(">");
			else if (this.currentToken.type == "tab")
				this.eat("tab");
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

	this.codeBlock = function(tokenStart, frontTokens) {
		if (globalDebug) console.log("'codeBlock' rule called");
		var node = { type: "codeblock", children: [] };
		var breakBlock = false;

		this.eatFront(frontTokens, tokenStart);
		node.children.push(this.codeLine());
		if (globalDebug) console.log("'codeLine' rule returned");

		if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
			breakBlock = true;

		while(!breakBlock) {

			var newFrontTokens = this.lineFrontCheck();

			if (!this.compareFront(frontTokens, newFrontTokens, tokenStart))
				breakBlock = true;
			else {
				this.eatFront(frontTokens, tokenStart);	
				node.children.push(this.codeLine());
				if (globalDebug) console.log("'codeLine' rule returned");
			}

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
		var tempCheck = this.lineFrontCheck();

		var node = { type: "blockquote", children: [] };
		var breakBlock = false;

		while (!breakBlock) {
			var nestCheck = 0;
			var peekLevel = 0;
			if (globalDebug) console.log("'blank' rule returned");

			for (var i = tokenStart + 1; i < tempCheck.length; i++) {
				if (tempCheck[i].name == "blockquote")
					nestCheck++;
				else
					break;
			}

			if (nestCheck > tokenIndex) {
				node.children.push(this.blockQuote(tokenStart, nestCheck, frontTokens));
				if (globalDebug) console.log("'blockquote' rule returned");
				tempCheck = this.lineFrontCheck();

				breakBlock = true;
				if (tempCheck.length > tokenIndex) {
					if (tempCheck[tokenIndex].name == "blockquote")
						breakBlock = false;
				}
			}

			else if (nestCheck < tokenIndex) {
				breakBlock = true;
			}

			else if (nestCheck == tokenIndex) {

				if (this.currentToken.type == "tab") {
					node.children.push(this.codeBlock(tokenStart + nestCheck + 1, frontTokens));
					if (globalDebug) console.log("'codeblock' rule returned");
					frontTokens = this.lineFrontCheck();
				}
				else {
					this.eatFront(tempCheck, tokenStart + tokenIndex + 1);
					node.children.push(this.line());
					if (globalDebug) console.log("'line' rule returned");
					tempCheck = this.lineFrontCheck();
					var sliceFrontTokens = frontTokens.slice(0, -tokenIndex);

					if (tempCheck.length == frontTokens.length - tokenIndex) {
						var compareCheck = this.compareFront(sliceFrontTokens, tempCheck);
					}
					else
						var compareCheck = false;

					while (compareCheck && this.currentToken.type != "EOF") {
						this.eatFront(tempCheck, tokenStart + tokenIndex);
						node.children.push(this.line());
						if (globalDebug) console.log("'line' rule returned");

						tempCheck = this.lineFrontCheck();

						if (tempCheck.length == frontTokens.length - tokenIndex) {
							compareCheck = this.compareFront(sliceFrontTokens, tempCheck);
						}
						else
							compareCheck = false;
					}
				}

				tempCheck = this.lineFrontCheck();

				var sliceTempCheck = tempCheck.slice(0, tokenIndex);
				var sliceFrontTokens = frontTokens.slice(0, tokenIndex);

				if (!this.compareFront(sliceFrontTokens, sliceTempCheck))
					breakBlock = true;
				else if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
					breakBlock = true;
				if (tempCheck.length > 0) {
					if (tempCheck[tokenStart].name == "blockquote")
						breakBlock = false;
				}


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

	this.blankWithBlockQuote = function() {
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
		if (this.currentToken.type == ">") {
			this.eat(">");
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

		var peekLevel = 0;
		while (this.peekTokenType(peekLevel) == "space" || this.peekTokenType(peekLevel) == "tab" || this.peekTokenType(peekLevel) == ">")
			peekLevel++;

		if (this.peekTokenType(peekLevel) == "newline") {
			this.blankWithBlockQuote();	
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
				node.children.push("\t");
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