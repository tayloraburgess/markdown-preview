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

	this.parseBlocks = function() {
		var AST = { type: 'document', children: [] } ,
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

