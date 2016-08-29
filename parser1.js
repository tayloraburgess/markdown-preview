var helpers = require('./helpers');
var traverseAST = helpers.traverseAST;

function checkBlankLine(lineArray) {
	for (var i = 0; i < lineArray.length; i++) {
		if (lineArray[i] !== ' ' && lineArray[i] !== '\t') {
			return false;
		}
	}
	return true;
};

function blockParser(input) {
	this.inputList = input.split('');

	this.getLine = function() {
		if (this.inputList.length === 0) {
			return '\n';
		}
		else {
			var returnLine = '';
			while (this.inputList[0] !== '\n') {
				returnLine += this.inputList.shift();
				if (this.inputList.length === 0) {
					break;
				}
			}
			if (this.inputList.length !== 0) {
				this.inputList.shift();
			}
			return returnLine;
		}
	};

	this.findOpenChild = function(AST) {
		var node;

		if ('open' in AST) {
			if (AST.open === true) {
				if ('child' in AST) {
					if (AST.child === null) {
						return AST;
					}
					else {
						node = this.findOpenChild(AST.child);
					}
				}
				else if ('children' in AST) {
					if (AST.children.length === 0) {
						return AST;
					}
					else {
						for (var i = 0; i < AST.children.length; i++) {
							node = this.findOpenChild(AST.children[i]);
						}
					}
				}
			}
		}

		return node;
	};

	this.checkBlankLine = function(lineArray) {
		for (var i = 0; i < lineArray.length; i++) {
			if (lineArray[i] !== ' ' && lineArray[i] !== '\t') {
				return false;
			}
		}
		return true;
	};

	this.parseBlocks = function() {
		var AST = { type: 'document', open: true, children: [] },
			line = this.getLine().split(''),
			unmatchedBlocks = [],
			lastOpenBlock,
			traverseCallback;

		traverseCallback = function(node) {
			if ('open' in node) {
				if (node.open === true) {
					if (node.type === 'paragraph' && checkBlankLine(line) === true) {
						unmatchedBlocks.push(node);
					}
				}
			}
		};

		while (line !== '\n') {
			traverseAST(AST, traverseCallback);

			for (var i = 0; i < unmatchedBlocks.length; i++) {
				unmatchedBlocks[i].open = false;
			}

			lastOpenBlock = this.findOpenChild(AST);

			if (lastOpenBlock === undefined) {
				break;
			}

			if (lastOpenBlock.type === 'document') {
				var newParagraph = { type: 'paragraph', open: true, children: [] };
				lastOpenBlock.children.push(newParagraph);
				lastOpenBlock = newParagraph;
			}

			if ('children' in lastOpenBlock) {
				lastOpenBlock.children.push({ type: 'line', text: line.join('') });
			}
			else if ('child' in lastOpenBlock) {
				lastOpenBlock.child = { type: 'line', text: line.join('') };
			}

			line = this.getLine().split('');
		}

		return AST;
	};
}

module.exports = {
	blockParser: blockParser
};

