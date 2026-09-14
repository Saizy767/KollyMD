export class SearchResult {
  constructor(
    public readonly path: string,
    public readonly name: string,
    public readonly snippet: string,
    public readonly matchCount: number
  ) {}
}
