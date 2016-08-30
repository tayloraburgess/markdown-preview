/* eslint-env node */

import { traverseAST } from './helpers';

class BlockParser {
  constructor(input) {
    this.inputList = input.split('');
  }

  getLine() {
    if (this.inputList.length !== 0) {
      let returnLine = '';
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
    return '\n';
  }

  checkBlankLine(lineArray) {
    if (Array.isArray(lineArray)) {
      return lineArray.every((element) => {
        return element === ' ' || element === '\t';
      });
    }
    return null;
  }

  findOpenChild(AST) {
    let node;
    if ('open' in AST) {
      if (AST.open === true && 'children' in AST) {
        if (AST.children.length === 0) {
          return AST;
        }

        for (let i = 0; i < AST.children.length; i++) {
          node = this.findOpenChild(AST.children[i]);
        }
      }
    }
    return node;
  }

  parseBlocks() {
    const AST = { type: 'document', open: true, children: [] };
    const unmatchedBlocks = [];
    let line = this.getLine().split('');
    let lastOpenBlock;

    const traverseCallback = (node) => {
      if ('open' in node) {
        if (node.open === true) {
          if (node.type === 'paragraph' && this.checkBlankLine(line) === true) {
            unmatchedBlocks.push(node);
          }
        }
      }
    };

    while (line !== '\n') {
      traverseAST(AST, traverseCallback);

      unmatchedBlocks.forEach((element) => {
        element.open = false;
      });

      lastOpenBlock = this.findOpenChild(AST);

      if (lastOpenBlock === undefined) {
        break;
      }

      if (lastOpenBlock.type === 'document') {
        const newParagraph = { type: 'paragraph', open: true, children: [] };
        lastOpenBlock.children.push(newParagraph);
        lastOpenBlock = newParagraph;
      }

      lastOpenBlock.children.push({ type: 'line', text: line.join('') });

      line = this.getLine().split('');
    }

    return AST;
  }
}

export default BlockParser;
