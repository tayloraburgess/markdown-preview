var should = require('chai').should();

var parser1 = require('../parser1');
var blockParser = parser1.blockParser;

var helpers = require('../helpers');
var randomLines = helpers.randomLines;
var traverseAST = helpers.traverseAST;

describe('helpers.js', function() {

	describe('randomLines()', function() {

		it('should return a string', function() {
			var lines = randomLines();
			lines.should.be.a('string');
		});

		it('should return a string of the length passed to the parameters', function() {
			var length = randomLines(100).length;
			length.should.equal(100);
		});
	});

	describe('traverseAST()', function() {

		it('should perform the provide callback on each AST node', function() {
			var testAST = { type: 'node1', child:
				{ type: 'node2', children: [
					{ type: 'node3'},
					{ type: 'node4'}
				]}
			};

			var counter = 0;
			traverseAST(testAST, function() {
				counter++;
			});

			counter.should.equal(4);
		});
	});

});

describe ('parser1.js', function(){

	describe('blockParser()', function() {

		describe('getLine()', function() {

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

			it('should return a string containing a newline character if reaches the end of the text', function() {
				var testParser = new blockParser('line1\nline2');
				testParser.getLine();
				testParser.getLine();
				var line = testParser.getLine();
				line.should.equal('\n');

				testParser = new blockParser('');
				testParser.getLine();
				line.should.equal('\n');
			});

		});

		describe('findOpenChild()', function() {
			it('should return the last open block in a parser-generated AST', function() {
				var checkNode =  { type: 'node5', open: true, child: null },
					testAST = { type: 'node1', open: true, children: [
					{ type: 'node2', open: false, children: [
						{ type: 'node3', open: false},
						{ type: 'node4', open: false}
					]} ,
					checkNode
				]},
					testParser = new blockParser('');

				checkNode = testParser.findOpenChild(testAST);
				checkNode.should.equal(checkNode);

			});
		});

		describe('parseBlocks()', function() {

			it('should return a CommonMark-compliant AST', function() {
				var testParser = new blockParser(randomLines(200));
				var testAST = testParser.parseBlocks();

				var conditions = true;

				traverseAST(testAST, function() {
					if (!('type' in testAST)) {
						conditions = false;
					}

					if (!('child' in testAST) && !('children' in testAST)) {
						if (!('lines' in testAST)) {
							conditions = false;
						}
						else if (testAST.lines.length === 0) {
							conditions = false;
						}
						else {
							for (var i = 0; i < testAST.lines.length; i++) {
								if (typeof testAST.lines[i] !== 'string') {
									conditions = false;
								}
							}
						}
					}
				});

				conditions.should.equal(true);
			});
		});
	});
});