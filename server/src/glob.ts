export class Glob {
  #match!: RegExpMatchArray;

  private REGEX = /([\w-]+)\.\{?([^}]+)\}?$/;

  constructor(pattern: string) {
    this.#match = pattern.match(this.REGEX)!;
    if (!this.#match) {
      throw new Error('Could not parse glob pattern');
    }
  }

  get base(): string {
    return this.#match[1];
  }

  get exts(): string[] {
    return this.#match[2].split(',');
  }

  get suffixes(): string[] {
    return this.exts.map((ext) => `${this.base}.${ext}`);
  }

  matchesSuffix(target: string): boolean {
    return this.suffixes.some((s) => target.endsWith(s));
  }
}
