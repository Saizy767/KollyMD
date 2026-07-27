export class NoteEntry {
  constructor(
    public readonly path: string,
    public readonly name: string,
    public readonly isDirectory: boolean,
    public readonly children: NoteEntry[] = []
  ) {}
}
