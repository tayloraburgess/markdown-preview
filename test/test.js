/* eslint-env node, mocha */

import { should } from 'chai';
import { BlockParser, checkBlankLine } from '../parser1';
import { randomLines, traverseAST } from '../helpers';

should();

describe('helpers.js', () => {
  describe('randomLines()', () => {
    it('should return a string', () => {
      const lines = randomLines();
      lines.should.be.a('string');
    });

    it('should return a string of the length passed to the parameters', () => {
      const length = randomLines(100).length;
      length.should.equal(100);
    });
  });

  describe('traverseAST()', () => {
    it('should perform the provided callback on each AST node', () => {
      const testAST = {
        type: 'node1',
        children: [
          { type: 'node2',
            children: [
              { type: 'node3' },
              { type: 'node4' },
            ],
          },
        ],
      };

      let counter = 0;

      traverseAST(testAST, () => {
        counter++;
      });

      counter.should.equal(4);
    });
  });
});

describe('parser1.js', () => {
  describe('checkBlankLine()', () => {
    it('should return true when the input character array contains only spaces and tabs', () => {
      const testString = '             ';
      const isBlank = checkBlankLine(testString.split(''));
      isBlank.should.equal(true);
    });

    it('should return false when the input character array contains other characters', () => {
      const testString = '   d     jsdf   foo  ';
      const isBlank = checkBlankLine(testString.split(''));
      isBlank.should.equal(false);
    });
  });

  describe('BlockParser()', () => {
    describe('getLine()', () => {
      it('should return a single line of text', () => {
        const testParser = new BlockParser('line1\nline2');
        const line = testParser.getLine();
        line.should.equal('line1');
      });

      it('should progress through lines on successive calls', () => {
        const testParser = new BlockParser('line1\nline2\nline3');
        testParser.getLine();
        const line2 = testParser.getLine();
        const line3 = testParser.getLine();
        line2.should.equal('line2');
        line3.should.equal('line3');
      });

      it('should return a newline character if it reaches the end of the text', () => {
        let testParser = new BlockParser('line1\nline2');
        testParser.getLine();
        testParser.getLine();
        let line = testParser.getLine();
        line.should.equal('\n');

        testParser = new BlockParser('');
        line = testParser.getLine();
        line.should.equal('\n');
      });
    });

    describe('findOpenChild()', () => {
      it('should return the last open block in a parser-generated AST', () => {
        let checkNode = { type: 'node5', open: true, children: [] };

        const testAST = {
          type: 'node1',
          open: true,
          children: [
            {
              type: 'node2',
              open: false,
              children: [
                {
                  type: 'node3',
                  open: false,
                },
                {
                  type: 'node4',
                  open: false,
                },
              ],
            },
            checkNode,
          ],
        };

        const testParser = new BlockParser('');
        checkNode = testParser.findOpenChild(testAST);
        checkNode.should.equal(checkNode);
      });
    });

    describe('parseBlocks()', () => {
      it('should return a CommonMark-compliant AST', () => {
        const testParser = new BlockParser(randomLines(200));
        const testAST = testParser.parseBlocks();
        let conditions = true;

        traverseAST(testAST, (node) => {
          if (!('type' in node)) {
            conditions = false;
          }

          if ('children' in node) {
            if (!('open' in node)) {
              conditions = false;
            }
          } else if (!('text' in node)) {
            conditions = false;
          } else if (typeof node.text !== 'string') {
            conditions = false;
          }
        });

        conditions.should.equal(true);
      });
    });
  });
});
