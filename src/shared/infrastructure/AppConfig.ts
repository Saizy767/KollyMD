export class AppConfig {
  constructor(
    public readonly userDataPath: string,
    public readonly stateFilePath: string
  ) {}

  static create(userDataPath: string): AppConfig {
    const stateFileName = 'kollymd-state.json'
    const sep = userDataPath.includes('/') ? '/' : '\\'
    return new AppConfig(userDataPath, `${userDataPath}${sep}${stateFileName}`)
  }
}
