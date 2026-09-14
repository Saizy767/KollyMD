export interface SearchResultDto {
  path: string
  name: string
  snippet: string
  matchCount: number
}

export interface SearchEntryDto {
  path: string
  name: string
  kind: 'file' | 'folder'
  snippet: string | null
  matchCount: number
}
