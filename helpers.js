/* eslint-env node */

export function randomLines(stringLength = 75) {
  const possible = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\n\t !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';

  return Array(stringLength).fill('').map(() => {
    return possible.charAt(Math.random() * (possible.length - 1));
  }).join('');
}

export function traverseAST(AST, callback) {
  if (typeof callback === 'function') {
    callback(AST);
  }

  if ('children' in AST) {
    if (AST.children.length) {
      AST.children.forEach((element) => traverseAST(element, callback));
    }
  }
}
