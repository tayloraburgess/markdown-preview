function randomLines(stringLength) {

	var returnString = '',
		possible = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\n\t \!\"#$%&\'\(\)*+\,-./:\;<=>?@\[\\\]\^\_`\{\|\}~',
		stringLength = stringLength || 75;

	for (var i = 0; i < stringLength; i++) {
		returnString += possible.charAt(Math.random() * (possible.length - 1));
	}
	return returnString;
}

function traverseAST(AST, callback) {
	if (typeof callback === "function") {
		callback(AST);
	}

	if ('child' in AST) {
		if (AST.child !== null) {
			traverseAST(AST.child, callback);
		}
	}

	else if ('children' in AST) {
		if (AST.children.length !== 0) {
			for (var i = 0; i < AST.children.length; i++) {
				traverseAST(AST.children[i], callback);
			}
		}
	}
}

module.exports = {
	randomLines: randomLines,
	traverseAST: traverseAST
};