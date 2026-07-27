export class Document {
  constructor(
    public readonly id: string,
    public path: string | null,
    public dirty: boolean = false
  ) {}
}
