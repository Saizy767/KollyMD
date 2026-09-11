export class SearchEntry {
  constructor(
    public readonly path: string,
    public readonly name: string,
    public readonly kind: 'file' | 'folder',
    public readonly snippet: string | null,
    public readonly matchCount: number
  ) {}
}
