export interface RenderedMarkdownDto {
  html: string
}

export interface BacklinkDto {
  sourcePath: string
  sourceName: string
}

export interface NoteRefDto {
  path: string
  name: string
}

export interface ResolvedLinkDto {
  path: string
}

export interface CreatedNoteFromLinkDto {
  path: string
}
