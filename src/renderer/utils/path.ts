export function basename(p: string): string {
  return p.split(/[/\\]/).filter(Boolean).pop() || p
}

export function pathDirname(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(0, idx) : ''
}

export function pathBasename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(idx + 1) : p
}

export function ensureMdExtension(name: string): string {
  return name.toLowerCase().endsWith('.md') ? name : name + '.md'
}

export function docName(path: string | null): string {
  if (!path) return 'untitled'
  const parts = path.split('/')
  return parts[parts.length - 1]
}
