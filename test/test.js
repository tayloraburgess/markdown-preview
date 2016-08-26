var should = require('chai').should();

var parser1 = require('../parser1');
var blockParser = parser1.blockParser;

describe('#blockParser()', function() {

	describe('#getLine()', function() {
		it('should return a single line of text', function() {
			var testParser = new blockParser('line1\nline2');
			var line = testParser.getLine();
			line.should.equal('line1');
		});
		it('should progress through lines on successive calls', function() {
			var testParser = new blockParser('line1\nline2\nline3');
			testParser.getLine();
			var line2 = testParser.getLine();
			var line3 = testParser.getLine();
			line2.should.equal('line2');
			line3.should.equal('line3');
		});
		it('should return an empty string if the line is blank', function() {
			var testParser = new blockParser('line1\n\nline2');
			testParser.getLine();
			var line = testParser.getLine();
			line.should.equal('');

			var testParser = new blockParser('\n\nline2');
			var line1 = testParser.getLine();
			var line2 = testParser.getLine();
			line1.should.equal('');
			line2.should.equal('');

			var testParser = new blockParser('   	 \nline2');
			var line = testParser.getLine();
			line2.should.equal('');

			var testParser = new blockParser('line1\n  	  	 \nline3');
			testParser.getLine();
			var line = testParser.getLine();
			line.should.equal('');
		});
		it('should return a string containing a newline character if reaches the end of the text', function() {
			var testParser = new blockParser('line1\nline2');
			testParser.getLine();
			testParser.getLine();
			var line = testParser.getLine();
			line.should.equal('\n');

			var testParser = new blockParser('');
			testParser.getLine();
			line.should.equal('\n');
		});

	});
});