/* eslint-env node */

import { traverseAST } from './helpers';

function checkBlankLine(lineArray) {
  for (let i = 0; i < lineArray.length; i++) {
    if (lineArray[i] !== ' ' && lineArray[i] !== '\t') {
      return false;
    }
  }
  return true;
}

function BlockParser(input) {
  this.inputList = input.split('');

  this.getLine = () => {
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
  };

  this.findOpenChild = (AST) => {
    let node;

    if ('open' in AST) {
      if (AST.open === true && 'children' in AST) {
        for (let i = 0; i < AST.children.length; i++) {
          node = this.findOpenChild(AST.children[i]);
        }
        if (AST.children.length === 0) {
          return AST;
        }
      }
    }

    return node;
  };

  this.parseBlocks = () => {
    const AST = { type: 'document', open: true, children: [] };
    const unmatchedBlocks = [];
    let line = this.getLine().split('');
    let lastOpenBlock;

    const traverseCallback = (node) => {
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

      for (let i = 0; i < unmatchedBlocks.length; i++) {
        unmatchedBlocks[i].open = false;
      }

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
  };
}

module.exports = {
  BlockParser,
  checkBlankLine,
};

