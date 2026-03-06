import * as ESLintParser from '@typescript-eslint/typescript-estree';
import * as Acorn from 'acorn';
import * as walk from 'acorn-walk';

import type { ParserOptions } from '@typescript-eslint/types';
import type { AST } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

interface Method {
  name: string;
  loc?: {
    start: {
      character: number;
      line: number;
    };
    end: {
      character: number;
      line: number;
    };
  };
}

export class ControllerParser {
  sourceCode: string;
  methods: Method[];

  private parser = ESLintParser;
  private readonly parserOptions: ParserOptions = {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    sourceType: 'module',
    ecmaVersion: 'latest',
  };

  constructor(sourceCode: string) {
    this.sourceCode = sourceCode;
    this.methods = [];
  }

  parse() {
    walk.simple(
      this.#ast as unknown as Acorn.Node,
      {
        MethodDefinition: (node) => {
          this.#registerMethod(node);
          // console.log('found method definition');
          // console.log(node);
        },
        PropertyDefinition: (node) => {
          this.#registerProperty(node);
          // console.log('found property definition');
          // console.log(node);
        },
      },
      walk.base,
    );
  }

  #registerMethod(node: Acorn.MethodDefinition) {
    if (node.kind !== 'method') return;
    if (node.key.type !== 'Identifier') return;

    const tsNode = node as unknown as TSESTree.MethodDefinition;
    if (tsNode.accessibility === 'private') return;

    const method: Method = {
      name: node.key.name,
    };
    const loc = node.key.loc;
    if (loc) {
      method.loc = {
        start: {
          line: loc.start.line,
          character: loc.start.column,
        },
        end: {
          line: loc.end.line,
          character: loc.end.column,
        },
      };
    }
    this.methods.push(method);
  }

  #registerProperty(_node: Acorn.PropertyDefinition) {}

  get #ast(): AST<ParserOptions> {
    return this.parser.parse(this.sourceCode, this.parserOptions);
  }
}
