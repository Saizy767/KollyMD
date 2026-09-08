export class ButtonTemplate {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly iconPath: string,
    public readonly action: string
  ) {}

  isValid(): boolean {
    return this.id.length > 0 && this.name.length > 0 && this.iconPath.endsWith('.svg')
  }
}
