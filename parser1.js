var helpers = require('./helpers');
var traverseAST = helpers.traverseAST;

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

		if (AST.open == true) {
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

		return node;
	};

	this.parseBlocks = function() {
		var AST = { type: 'document', open: true, children: [] } ,
			line = this.getLine();

		while (line !== '\n') {
			AST.children.push({ type: 'paragraph', lines: line });
			line = this.getLine();
		}

		return AST;
	};
}

module.exports = {
	blockParser: blockParser
};

