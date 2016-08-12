#!/usr/bin/env node

var globalDebug = true;

function parser(inputArray) {
	this.tokenArray = inputArray;
	this.position = 0;

	this.error = function() {
		throw "Invalid syntax";
	}

	// * Basic Parser Functions *
	//
	// Get new tokens, eat tokens, parse tokens, etc.

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

	this.parse = function() {
		var node = this.blocks();

		if (this.currentToken.type != "EOF")
			this.error();

		return node;
	}

	this.peekTokenType = function(advancePosition) {
		if (this.position + (advancePosition - 1) < this.tokenArray.length)
			return this.tokenArray[this.position + (advancePosition - 1)].type;

		else
			return null;
	}

	this.peekTokenValue= function(advancePosition) {
		if (this.position + (advancePosition - 1) < this.tokenArray.length)
			return this.tokenArray[this.position + (advancePosition - 1)].value;

		else
			return null;
	}

	// * Peek Functions *
	//
	// Look ahead at tokens without eating them

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

	this.peekLine = function() {
		var peekLevel = 0;
		var checkString = "";
		var relativeIndex = {};
		var breakLoop = false;
		while (!breakLoop) {
			relativeIndex[checkString.length] = peekLevel + this.position;
			if (this.peekTokenType(peekLevel) == "space")
				checkString += " ";
			else if (this.peekTokenType(peekLevel) == "tab")
				checkString += "\t";
			else if (this.peekTokenType(peekLevel) == "plaintext" || this.peekTokenType(peekLevel) == "number")
				checkString += this.peekTokenValue(peekLevel);
			else if (this.peekTokenType(peekLevel) == "newline" || this.peekTokenType(peekLevel) == "EOF") {
				checkString += "\n";
				breakLoop = true;
			}
			else
				checkString += this.peekTokenType(peekLevel);
			peekLevel++;
		}

		var rulePatterns = {
			emphasis1: /\*(?!\*).?[^\*]+\*(?!\*)/,
			emphasis2: /_(?!_).?[^_]+_(?!_)/,
			strong1: /\*\*(?!\*).?[^\*]+\*\*(?!\*)/,
			strong2: /__(?!_).?[^_]+__(?!_)/,
			code1: /`[^`]+`(?!`)/,
			code2: /``(?!`).*[^`]?``(?!`)/,
			linebreak: /\s\s+\n/
		}

		var patternStorage = {
			emphasis1: "emphasis",
			emphasis2: "emphasis",
			strong1: "strong",
			strong2: "strong",
			code1: "code1",
			code2: "code2",
			linebreak: "linebreak"
		}

		var rules = {};

		for (rule in rulePatterns) {
			var checkPosition = -1;
			do {
				var preSearchLength = checkString.substring(0, checkPosition + 1).length;
				var searchIndex = checkString.substring(checkPosition + 1).search(rulePatterns[rule]);
				checkPosition = preSearchLength + searchIndex;
				if (searchIndex > -1)
					rules[relativeIndex[checkPosition]] = patternStorage[rule];
			} while (searchIndex > -1);
		}

		return rules;
	}

	// * Front Tokens Functions *
	//
	// Return standard arrays of block-level tokens
	// at the front of lines, and functions
	// to analyze/eat those tokens

	this.lineFrontCheck = function() {
		var frontTokens = [];
		var peekLevel = 0;
		var oneList = false;

		var frontTypes = [ ">", "*", "+", "-", "number", "tab" ];
		var listTypes = [ "*", "+", "-"];

		peekLevel += this.peekSpaces(peekLevel);

		while (frontTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {

			if (this.peekTokenType(peekLevel) == "tab") {
				frontTokens.push( { name: "tab"} );
				peekLevel++;
			}
			else if (this.peekTokenType(peekLevel) == ">") {
				frontTokens.push( { name: "blockquote"} );
				peekLevel++;
			}
			else if (listTypes.indexOf(this.peekTokenType(peekLevel)) > -1) {
				if (oneList)
					break;
				else {
					if (this.peekTokenType(peekLevel + 1) == "tab" || this.peekTokenType(peekLevel + 1) == "space") {
						frontTokens.push( { name: "list"} );
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
							frontTokens.push( { name: "orderedlist"} );
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
			else if (this.currentToken.type == "number") {
				this.eat("number");
				this.eat(".");
			}
			else if (this.currentToken.type == "-")
				this.eat("-");
			else if (this.currentToken.type == "+")
				this.eat("+");
			else if (this.currentToken.type == "*")
				this.eat("*");

			this.blankNoTab();
		}
	}

	// * Block Level Rules *
	//
	// Rules that process blockquotes, list,
	// and codeblocks

	this.blocks = function() {
		if (globalDebug) console.log("'blocks' rule called");
		var node = { type: "blocks", children: [] };
		while (this.currentToken.type != "EOF") {
			this.blankLine();
			if (globalDebug) console.log("'blankLine' rule returned");
			var frontTokens = this.lineFrontCheck();

			if (frontTokens.length > 0) {
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
					node.children.push(this.list(0, frontTokens, "unordered"));
					if (globalDebug) console.log("'list' rule returned");
				}
				else if (frontTokens[0].name == "orderedlist") {
					node.children.push(this.list(0, frontTokens, "ordered"));
					if (globalDebug) console.log("'list' rule returned");
				}
			}
			else {
				node.children.push(this.paragraph());
				if (globalDebug) console.log("'paragraph' rule returned");
			}
		}	
		return node;
	}

	this.paragraph = function() {
		if (globalDebug) console.log("'paragraph' rule called");

		var node = { type: "paragraph", children: [] };
		var frontTokens = this.lineFrontCheck();

		while (this.currentToken.type != "EOF" && this.currentToken.type != "newline" && frontTokens.length == 0) {
			node.children.push(this.line());
			if (globalDebug) console.log("'line' rule returned");

			frontTokens = this.lineFrontCheck();
		}

		return node;
	}

	this.list = function(tokenStart, inputFrontTokens, listType) {
		if (globalDebug) console.log("'list' rule called");
		var frontTokens = inputFrontTokens;
		if (listType == "unordered") {
			var node = { type: "unorderedlist", children: [] };
			var listTokenType = "list";
		}
		else if (listType == "ordered") {
			var node = { type: "orderedlist", children: [] };
			var listTokenType = "orderedlist"
		}
		var breakBlock = false;

		while(!breakBlock) {
			var newFrontTokens = this.lineFrontCheck();
			if (newFrontTokens.length >= frontTokens.length) {
				var pointNode = { type: "point", children: [] };
				var pointHolder = [];
				var paragraphs = false;
				var newParagraph = false;
				var failedParagraph = false;
				var hitPoint = false;

				var tempCheck = this.lineFrontCheck();
				var breakLoop = false;

				while (!breakLoop) {
					if (this.peekBlankLines(frontTokens, 2))
						breakLoop = true;

					else if (this.peekBlankLines(frontTokens, 1) && !this.peekBlankLines(frontTokens, 2)) {
						this.blankLine();
						if (globalDebug) console.log("'blankLine' rule returned");
						var tempCheck = this.lineFrontCheck();

						if (tempCheck.length >= frontTokens.length) {
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

					else if (tempCheck.length == frontTokens.length - 1) {
						for (var i = 0; i < tempCheck.length; i++) {
							if (tempCheck[i].name != frontTokens[i].name) {
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

					else if (tempCheck.length >= frontTokens.length) {

						for (var i = 0; i < tokenStart; i++) {
							if (tempCheck[i].name != frontTokens[i].name) {
								breakLoop = true;
								break;
							}
						}
						if (!breakLoop && tempCheck.length > tokenStart + 1 && tempCheck[tokenStart].name == "tab") {
							if (tempCheck.length > frontTokens.length) {
								if (tempCheck[tokenStart + 1].name == "tab") {
									pointHolder.push(this.codeBlock(tokenStart + 2, tempCheck));
									if (globalDebug) console.log("'codeBlock' rule returned");
								}
								else if (tempCheck[tokenStart + 1].name == "list") {
									pointHolder.push(this.list(tokenStart + 1, tempCheck, "unordered"));
									if (globalDebug) console.log("'list' rule returned");
								}
								else if (tempCheck[tokenStart + 1].name == "orderedlist") {
									pointHolder.push(this.orderedList(tokenStart + 1, tempCheck, "ordered"));
									if (globalDebug) console.log("'orderedList' rule returned");
								}
								else if (tempCheck[tokenStart + 1].name == "blockquote") {
									var nestCheck = 0;
									for (var i = tokenStart + 2; i < tempCheck.length; i++) {
										if (tempCheck[i].name == "blockquote")
											nestCheck++;
										else
											break;
									}
									pointHolder.push(this.blockQuote(tokenStart + 1, nestCheck + tokenStart + 1, tempCheck));
									if (globalDebug) console.log("'blockquote' rule returned");
								}
								tempCheck = this.lineFrontCheck();
							}
						}
						else if (!breakLoop && tempCheck.length > tokenStart + 2 && tempCheck[tokenStart].name == listTokenType) {
							if (tempCheck[tokenStart + 1].name == "tab") {
								if (tempCheck[tokenStart + 2].name == "tab") {
									pointHolder.push(this.codeBlock(tokenStart + 3, tempCheck));
									if (globalDebug) console.log("'codeBlock' rule returned");
								}
								else if (tempCheck[tokenStart + 2].name == "list") {
									pointHolder.push(this.list(tokenStart + 2, tempCheck, "unordered"));
									if (globalDebug) console.log("'list' rule returned");
								}
								else if (tempCheck[tokenStart + 2].name == "orderedlist") {
									pointHolder.push(this.orderedList(tokenStart + 2, tempCheck, "ordered"));
									if (globalDebug) console.log("'orderedList' rule returned");
								}
								else if (tempCheck[tokenStart + 2].name == "blockquote") {
									var nestCheck = 0;
									for (var i = tokenStart + 3; i < tempCheck.length; i++) {
										if (tempCheck[i].name == "blockquote")
											nestCheck++;
										else
											break;
									}
									pointHolder.push(this.blockQuote(tokenStart + 2, nestCheck + tokenStart + 2, tempCheck));
									if (globalDebug) console.log("'blockquote' rule returned");
								}
								else {
									this.eatFront(tempCheck);
									pointHolder.push(this.line());
									if (globalDebug) console.log("'line' rule returned");
									tempCheck = this.lineFrontCheck();
								}
								tempCheck = this.lineFrontCheck();
							}
						}
						else if (tempCheck[tokenStart].name == listTokenType) {
							if (hitPoint) {
								breakLoop = true;
							}
							else {
								this.eatFront(tempCheck);
								pointHolder.push(this.line());
								if (globalDebug) console.log("'line' rule returned");
								tempCheck = this.lineFrontCheck();
								hitPoint = true;
							}
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
					else
						breakLoop = true;

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
			 else
			 	breakBlock = true;

			if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
				breakBlock = true;
		}
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

			if (nestCheck + tokenStart > tokenIndex) {
				node.children.push(this.blockQuote(tokenStart, tokenStart + nestCheck, frontTokens));
				if (globalDebug) console.log("'blockquote' rule returned");
				tempCheck = this.lineFrontCheck();

				breakBlock = true;
				if (tempCheck.length > tokenIndex) {
					if (tempCheck[tokenIndex].name == "blockquote")
						breakBlock = false;
				}
			}

			else if (nestCheck + tokenStart < tokenIndex) {
				breakBlock = true;
			}

			else if (nestCheck + tokenStart == tokenIndex) {
				if (tempCheck.length > tokenIndex + 1) {
					if (tempCheck[tokenIndex + 1].name == "tab") {
						node.children.push(this.codeBlock(tokenStart + nestCheck + 1, frontTokens));
						if (globalDebug) console.log("'codeblock' rule returned");
						frontTokens = this.lineFrontCheck();
					}
					else if (tempCheck[tokenIndex + 1].name == "list") {
						node.children.push(this.list(tokenStart + nestCheck + 1, frontTokens, "unordered"));
						if (globalDebug) console.log("'list' rule returned");
						frontTokens = this.lineFrontCheck();
					}
					else if (tempCheck[tokenIndex + 1].name == "orderedlist") {
						node.children.push(this.orderedList(tokenStart + nestCheck + 1, frontTokens, "ordered"));
						if (globalDebug) console.log("'orderedlist' rule returned");
						frontTokens = this.lineFrontCheck();
					}
				}
				else {
					this.eatFront(tempCheck);
					node.children.push(this.line());
					if (globalDebug) console.log("'line' rule returned");
					tempCheck = this.lineFrontCheck();
		
					var popFrontTokens = frontTokens.splice(tokenStart, tokenIndex - tokenStart + 1);

					if (this.compareFront(frontTokens, tempCheck) || this.compareFront(popFrontTokens, tempCheck))
						var compare = true;
					else
						var compare = false;

					while (compare && this.currentToken.type != "EOF") {
						this.eatFront(tempCheck);
						node.children.push(this.line());
						if (globalDebug) console.log("'line' rule returned");

						tempCheck = this.lineFrontCheck();

						if (this.compareFront(frontTokens, tempCheck) || this.compareFront(popFrontTokens, tempCheck)) {
							compare = true;
						}
						else
							compare = false;
					}
				}

				tempCheck = this.lineFrontCheck();

				var sliceTempCheck = tempCheck.slice(0, tokenStart + tokenIndex);
				var sliceFrontTokens = frontTokens.slice(0, tokenStart + tokenIndex);

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

	this.codeBlock = function(tokenStart, frontTokens) {
		if (globalDebug) console.log("'codeBlock' rule called");
		var node = { type: "codeblock", children: [] };
		var breakBlock = false;

		this.eatFront(frontTokens, tokenStart + 1);
		node.children.push(this.codeLine());
		if (globalDebug) console.log("'codeLine' rule returned");

		if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
			breakBlock = true;

		while(!breakBlock) {

			var newFrontTokens = this.lineFrontCheck();

			if (!this.compareFront(frontTokens, newFrontTokens, tokenStart))
				breakBlock = true;
			else {
				this.eatFront(frontTokens, tokenStart + 1);	
				node.children.push(this.codeLine());
				if (globalDebug) console.log("'codeLine' rule returned");
			}

			if (this.currentToken.type == "newline" || this.currentToken.type == "EOF")
				breakBlock = true;
		}
		return node;
	}

	// * Line Rules *
	//
	// Rules to parse different types of lines

	this.line = function() {
		if (globalDebug) console.log("'line' rule called");
		var checkRules = this.peekLine();
		var node = { type: "line", children: [] };
		while (this.currentToken.type != "newline" && this.currentToken.type != "EOF") {

			if (this.position in checkRules) {
				if (checkRules[this.position] == "emphasis") {
					node.children.push(this.emphasis(checkRules));
					if (globalDebug) console.log("'emphasis' rule returned");
				}
				else if (checkRules[this.position] == "strong") {
					node.children.push(this.strong(checkRules));
					if (globalDebug) console.log("'strong' rule returned");
				}
				else if (checkRules[this.position] == "code1") {
					node.children.push(this.inlineCode("`"));
					if (globalDebug) console.log("'code' rule returned");
				}
				else if (checkRules[this.position] == "code2") {
					node.children.push(this.inlineCode("``"));
					if (globalDebug) console.log("'code' rule returned");
				}
				else if (checkRules[this.position] == "linebreak") {
					this.blank();
					node.children.push({ type: "linebreak" })
				}
			}
			else {
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
		}
		if (this.currentToken.type == "newline")
			this.eat("newline");
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

	// * Line-Level Rules *
	//
	// Rules to process elements tokens
	// on the individual line level

	this.subLine = function(rules, endType) {
		if (globalDebug) console.log("'subLine' rule called");
		var checkRules = rules;
		var node = { type: "subline", children: [] };
		while (this.currentToken.type != endType && this.currentToken.type != "EOF") {

			if (this.position in checkRules) {
				if (checkRules[checkRules['index']] == "emphasis") {
					node.children.push(this.emphasis(checkRules));
					if (globalDebug) console.log("'emphasis' rule returned");
				}
				else if (checkRules[checkRules['index']] == "strong") {
					node.children.push(this.strong(checkRules));
					if (globalDebug) console.log("'strong' rule returned");
				}
			}
			else {
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
		}
		return node;
	}

	this.subCodeLine = function(codeType) {
		if (globalDebug) console.log("'subCodeLine' rule called");
		var node = { type: "inlinecode", children: [] };
		var breakBlock = false;
		while (!breakBlock && this.currentToken.type != "EOF") {

			if (this.currentToken.type == "space")
				node.children.push(" ");
			else if (this.currentToken.type == "tab")
				node.children.push("	");
			else if (this.currentToken.type == "plaintext" || this.currentToken.type == "number")
				node.children.push(this.currentToken.value);
			else
				node.children.push(this.currentToken.type);

			this.currentToken = this.getNextToken();
			if (codeType == "`" && this.currentToken.type == "`")
				breakBlock = true;
			else if (codeType == "``") {
				var ticksNoSpace = this.currentToken.type == "`" && this.peekTokenType(1) == "`";
				var tickSpace = this.currentToken.type == "space" && this.peekTokenType(1) == "`" && this.peekTokenType(2) == "`";
				if (ticksNoSpace || tickSpace)
					breakBlock = true;
			}
		}
		return node;
	}

	this.emphasis = function(rules) {
		if (globalDebug) console.log("'emphasis' rule called");
		var checkRules = rules;
		var node = { type: "emphasis", children: [] };
		if (this.currentToken.type == "*") {
			this.eat("*");
			node.children.push(this.subLine(checkRules, "*"));
			if (globalDebug) console.log("'subLine' rule returned");
			this.eat("*");
		}
		else if (this.currentToken.type == "_") {
			this.eat("_");
			node.children.push(this.subLine(checkRules, "_"));
			if (globalDebug) console.log("'subLine' rule returned");
			this.eat("_");
		}

		return node;
	}

	this.strong = function(rules) {
		if (globalDebug) console.log("'strong' rule called");
		var checkRules = rules;
		var node = { type: "strong", children: [] };
		if (this.currentToken.type == "*") {
			this.eat("*");
			this.eat("*");
			node.children.push(this.subLine(checkRules, "*"));
			if (globalDebug) console.log("'subLine' rule returned");
			this.eat("*");
			this.eat("*");
		}
		else if (this.currentToken.type == "_") {
			this.eat("_");
			this.eat("_");
			node.children.push(this.subLine(checkRules, "_"));
			if (globalDebug) console.log("'subLine' rule returned");
			this.eat("_");
			this.eat("_");
		}

		return node;
	}

	this.inlineCode = function(codeType) {
		if (globalDebug) console.log("'inlineCode' rule called");
		var node;
		if (codeType == "`") {
			this.eat("`");
			node = this.subCodeLine(codeType);
			this.eat("`");
		}
		else if (codeType == "``") {
			this.eat("`");
			this.eat("`");
			if (this.currentToken.type == "space")
				this.eat("space");
			node = this.subCodeLine(codeType);
			if (this.currentToken.type == "space")
				this.eat("space");
			this.eat("`");
			this.eat("`");
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
}

module.exports = {
	parser: parser
}