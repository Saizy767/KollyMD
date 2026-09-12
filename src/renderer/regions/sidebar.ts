import { getSelectedFolder, getVaultRootPath, getDisplayPath, setDisplayPath } from '../state'
import type { ModRegistry } from '../mods/registry'

const sidebarResizer = document.getElementById('sidebar-resizer') as HTMLDivElement
const vaultPathEl = document.getElementById('vault-path') as HTMLHeadingElement
const selectedGroup = document.getElementById('selected-group') as HTMLDivElement
const selectedLabel = document.getElementById('selected-label') as HTMLSpanElement
const explorerStatus = document.getElementById('explorer-status') as HTMLSpanElement

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 600
const SIDEBAR_DEFAULT = 280

const sidebarSheet = new CSSStyleSheet()
sidebarSheet.replaceSync(':root { --sidebar-width: ' + SIDEBAR_DEFAULT + 'px }')
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sidebarSheet]

let currentSidebarWidth = SIDEBAR_DEFAULT
let measureCtx: CanvasRenderingContext2D | null = null

export function getVaultPathEl(): HTMLHeadingElement {
  return vaultPathEl
}

function setSidebarWidth(width: number): void {
  currentSidebarWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width))
  sidebarSheet.replaceSync(':root { --sidebar-width: ' + currentSidebarWidth + 'px }')
}

function measureText(text: string): number {
  if (!measureCtx) {
    const canvas = document.createElement('canvas')
    measureCtx = canvas.getContext('2d')
  }
  if (!measureCtx) return text.length * 7
  const style = getComputedStyle(explorerStatus)
  measureCtx.font = style.fontSize + ' ' + style.fontFamily
  return measureCtx.measureText(text).width
}

function computeTruncatedPath(p: string, maxWidth: number): string {
  if (!p || maxWidth <= 0) return ''
  const sep = p.includes('\\') ? '\\' : '/'
  const parts = p.split(/[/\\]/).filter(Boolean)
  if (parts.length === 0) return p
  const truncParts = parts.map(s => (s.length > 20 ? s.slice(0, 18) + '...' : s))
  const leadingSep = p.startsWith('/') ? '/' : ''
  for (let keep = truncParts.length; keep >= 1; keep--) {
    const child = truncParts.slice(-keep)
    const collapsed = parts.length - keep
    const candidate =
      collapsed > 0 ? '..' + sep + child.join(sep) : leadingSep + child.join(sep)
    if (measureText(candidate) <= maxWidth) return candidate
  }
  return '..' + sep + truncParts[truncParts.length - 1]
}

function renderTruncatedPath(): void {
  const dp = getDisplayPath()
  if (!dp) {
    explorerStatus.textContent = ''
    explorerStatus.title = ''
    return
  }
  const available = selectedGroup.clientWidth - selectedLabel.offsetWidth - 6
  explorerStatus.textContent = computeTruncatedPath(dp, available)
  explorerStatus.title = dp
}

new ResizeObserver(() => renderTruncatedPath()).observe(selectedGroup)

export function updateSelectedFolderDisplay(): void {
  const sf = getSelectedFolder()
  const vr = getVaultRootPath()
  if (sf) {
    setDisplayPath(sf)
  } else if (vr) {
    setDisplayPath(vr + ' (root)')
  } else {
    setDisplayPath('')
  }
  renderTruncatedPath()
}

export function initSidebar(): void {
  window.api.state.getSidebarWidth().then((width) => {
    if (width !== null) setSidebarWidth(width)
  }).catch(() => {})

  sidebarResizer.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = currentSidebarWidth
    document.body.classList.add('dragging')

    const onMove = (ev: MouseEvent): void => {
      setSidebarWidth(startWidth + (ev.clientX - startX))
    }
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('dragging')
      window.api.state.setSidebarWidth(currentSidebarWidth).catch(() => {})
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  sidebarResizer.addEventListener('dblclick', () => {
    setSidebarWidth(SIDEBAR_DEFAULT)
    window.api.state.setSidebarWidth(SIDEBAR_DEFAULT).catch(() => {})
  })
}

export function renderModSidebarButtons(registry: ModRegistry): void {
  const commandBar = document.getElementById('command-bar')
  if (!commandBar) return

  commandBar.querySelectorAll('.mod-sidebar-btn').forEach((btn) => btn.remove())

  const addZone = commandBar.querySelector('.cmd-add-zone')

  registry.getSidebarButtons().forEach((button) => {
    const btn = document.createElement('button')
    btn.className = 'cmd-btn mod-sidebar-btn'
    btn.title = ''
    btn.dataset.modButtonId = button.id
    if (button.templateId) btn.dataset.templateId = button.templateId
    if (button.iconUrl) {
      const icon = document.createElement('img')
      icon.className = 'cmd-btn-icon'
      icon.src = button.iconUrl
      icon.alt = ''
      btn.appendChild(icon)
    }
    const del = document.createElement('span')
    del.className = 'cmd-delete'
    del.textContent = '−'
    btn.appendChild(del)
    if (!button.templateId) {
      btn.addEventListener('click', () => button.onClick())
    }
    if (addZone) {
      commandBar.insertBefore(btn, addZone)
    } else {
      commandBar.appendChild(btn)
    }
  })
}
