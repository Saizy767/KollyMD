import type { MarkdownRenderer } from '../../domain/interfaces/MarkdownRenderer'
import type { RenderedMarkdownDto } from '../dto'

export class RenderMarkdown {
  constructor(private readonly renderer: MarkdownRenderer) {}

  execute(content: string): RenderedMarkdownDto {
    const html = this.renderer.render(content)
    return { html }
  }
}
