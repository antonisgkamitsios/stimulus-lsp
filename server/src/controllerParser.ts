import * as ESLintParser from '@typescript-eslint/typescript-estree';
import * as Acorn from 'acorn';
import * as walk from 'acorn-walk';

import type { ParserOptions } from '@typescript-eslint/types';
import type { AST } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { dasherize } from './utils';
import { Class, Method, Target, Value, WithNameAndLocation } from './types';

export class ControllerParser {
  #sourceCode: string;
  #filePath: string;

  methods: Method[];
  targets: Target[];
  values: Value[];
  classes: Class[];

  private parser = ESLintParser;
  private readonly parserOptions: ParserOptions = {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    sourceType: 'module',
    ecmaVersion: 'latest',
  };

  constructor(sourceCode: string, filePath: string) {
    this.#sourceCode = sourceCode;
    this.#filePath = filePath;

    // method name is as is in js
    this.methods = [];
    // target name is as is in js
    this.targets = [];
    // value name is dasherized
    this.values = [];
    // class name is dasherized
    this.classes = [];
  }

  static parse(sourceCode: string, filePath: string): ControllerParser {
    const instance = new ControllerParser(sourceCode, filePath);
    instance.#parse();

    return instance;
  }

  #parse() {
    walk.simple(
      this.#ast as unknown as Acorn.Node,
      {
        MethodDefinition: (node) => {
          this.#registerMethod(node);
        },
        PropertyDefinition: (node) => {
          this.#registerProperty(node);
        },
      },
      // extend the walk.RecursiveVisitors to recognize JSXElement
      // we ignore it (there is no plan to walk jsx trees)
      // we just don't want for the walker to throw when it encounters jsx
      { ...walk.base, JSXElement() {} } as walk.RecursiveVisitors<unknown>,
    );
  }

  #registerMethod(node: Acorn.MethodDefinition | Acorn.PropertyDefinition) {
    // we don't want to include private methods
    if (node.key.type !== 'Identifier') return;

    // we don't want to include getters and setters
    if (node.type === 'MethodDefinition' && node.kind !== 'method') return;

    // we don't want to include static methods
    if (node.static) return;

    if (this.#nodeIsTsPrivate(node)) return;

    const method: Method = {
      name: node.key.name,
    };
    this.#addLocToProperty(method, node.key.loc);

    this.methods.push(method);
  }

  #registerProperty(node: Acorn.PropertyDefinition) {
    // we don't want to include private properties
    if (node.key.type !== 'Identifier') return;

    if (this.#nodeIsTsPrivate(node)) return;

    if (node.value?.type === 'ArrayExpression') {
      this.#parseArrayExpression(node.key.name, node.value.elements);
    } else if (node.value?.type === 'ObjectExpression') {
      this.#parseObjectExpression(node.key.name, node.value.properties);
    } else if (node.value?.type === 'ArrowFunctionExpression') {
      this.#registerMethod(node);
    }
  }

  #parseArrayExpression(expressionName: string, elements: (Acorn.Expression | Acorn.SpreadElement | null)[]) {
    if (expressionName !== 'targets' && expressionName !== 'classes') return;

    elements.forEach((el) => {
      if (!el) return;
      if (el.type !== 'Literal') return;

      if (typeof el.value !== 'string') return;

      const identifier: Class | Target = {
        name: el.value,
      };
      this.#addLocToProperty(identifier, el.loc);

      if (expressionName === 'targets') {
        this.targets.push(identifier);
      } else if (expressionName === 'classes') {
        identifier.name = dasherize(identifier.name);
        this.classes.push(identifier);
      }
    });
  }

  #parseObjectExpression(expressionName: string, properties: (Acorn.Property | Acorn.SpreadElement)[]) {
    if (expressionName !== 'values') return;

    properties.forEach((prop) => {
      // we don't support spread elements
      // static values = {...spread}
      if (prop.type === 'SpreadElement') return;

      if (prop.key.type !== 'Identifier') return;

      const value: Value = {
        name: dasherize(prop.key.name),
      };

      this.#addLocToProperty(value, prop.key.loc);

      this.values.push(value);
    });
  }

  #addLocToProperty(obj: WithNameAndLocation, loc: Acorn.SourceLocation | null | undefined) {
    if (!loc) return;

    obj.loc = {
      start: {
        line: loc.start.line - 1,
        character: loc.start.column,
      },
      end: {
        line: loc.end.line - 1,
        character: loc.end.column,
      },
    };
  }

  #nodeIsTsPrivate(node: Acorn.Node): boolean {
    const tsNode = node as unknown as TSESTree.MethodDefinition;
    return tsNode.accessibility === 'private';
  }

  get #ast(): AST<ParserOptions> {
    return this.parser.parse(this.#sourceCode, { ...this.parserOptions, filePath: this.#filePath });
  }
}
