import { describe, expect, it } from 'vitest';
import { Glob } from './glob';

describe('Glob', () => {
  describe('when pattern is simple', () => {
    const glob = new Glob('**/*_controller.ts');

    it('returns the correct attributes', () => {
      expect(glob.base).toBe('_controller');
      expect(glob.exts).toEqual(['ts']);
      expect(glob.suffixes).toEqual(['_controller.ts']);
    });
  });

  describe('when pattern is complex', () => {
    const glob = new Glob('**/*_controller.{js,ts}');

    it('returns the correct attributes', () => {
      expect(glob.base).toBe('_controller');
      expect(glob.exts).toEqual(['js', 'ts']);
      expect(glob.suffixes).toEqual(['_controller.js', '_controller.ts']);
    });
  });

  describe('when glob pattern has hyphen', () => {
    const glob = new Glob('**/*-controller.{js,ts}');

    it('returns the correct attributes', () => {
      expect(glob.base).toBe('-controller');
      expect(glob.exts).toEqual(['js', 'ts']);
      expect(glob.suffixes).toEqual(['-controller.js', '-controller.ts']);
    });
  });

  describe('when pattern is irrelevant', () => {
    it('throws', () => {
      expect(() => new Glob('whatever')).toThrow(/Could not parse glob pattern/);
    });
  });
});
