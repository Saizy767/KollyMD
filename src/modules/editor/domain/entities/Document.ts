export class Document {
  constructor(
    public readonly id: string,
    public readonly path: string | null,
    public readonly dirty: boolean = false
  ) {}
}
