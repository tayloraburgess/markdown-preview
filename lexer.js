#!/usr/bin/env node

var globalDebug = true;

function token(initType, initValue) {
	this.type = initType;
	if (initValue != null)
		this.value = initValue;
	else 
		this.value = null;
}

function lexer(inputText) {
	this.position = 0;
	this.text = inputText;
	this.currentChar = this.text[this.position];

	this.digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

	this.hruleAsterisk =  /(?:\s*\*\s*){3,}(?:$|\n)/;
	this.hruleDash =  /(?:\s*-\s*){3,}(?:$|\n)/;
	this.hruleUnderscore = /(?:\s*_\s*){3,}(?:|\n)/;

	this.atxheader = /#{1,6}.+/

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
				return this.checkInt();
			}
			else if (this.currentChar == " ") {
				if (this.peek(1) == " ") {
					if (this.peek(2) == " ") {
						if (this.peek(3) == " ") {
							this.advance(4);
							return new token ("tab");
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
				if (this.text.substring(this.position).search(this.hruleDash) == 0) {
					this.advance(1);
					return new token("-", "hrule");
				}
				this.advance(1);
				return new token("-");
			}
			else if (this.currentChar == "_") {
				if (this.text.substring(this.position).search(this.hruleUnderscore) == 0) {
					this.advance(1);
					return new token("_", "hrule");
				}
				this.advance(1);
				return new token("_");
			}
			else if (this.currentChar == "#") {
				if (this.text.substring(this.position).search(this.atxheader) == 0) {
					this.advance(1);
					return new token("#", "atxheader");
				}
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
				if (this.text.substring(this.position).search(this.hruleAsterisk) == 0) {
					this.advance(1);
					return new token("*", "hrule");
				}
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

		if (!intString)
			intString = "";

		if (!(this.peek(1) in this.digits)) {
			intString += this.currentChar;
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
		console.log(JSON.stringify(tokenArray, null, "	"));
		return tokenArray;
	}
}

module.exports = {
	token: token, 
	lexer: lexer
};