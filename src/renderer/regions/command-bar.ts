import { showButtonTemplateDialog, type ButtonTemplateChoice } from '../ui/button-template-dialog'
import searchIconUrl from '../assets/search-icon.svg'
import llmIconUrl from '../assets/llm-icon.svg'
import clusterTreeIconUrl from '../assets/cluster-tree-icon.svg'
import filesystemIconUrl from '../assets/filesystem-icon.svg'
import type { SearchPanelApi } from './search-panel'
import type { LlmDialogApi } from './llm-dialog'

const commandBar = document.getElementById('command-bar') as HTMLDivElement
const cmdAddBtn = document.querySelector('.cmd-add') as HTMLButtonElement
const cmdAddZone = document.querySelector('.cmd-add-zone') as HTMLDivElement
const MAX_CMD_BUTTONS = 6

const explorerPanel = document.getElementById('explorer') as HTMLDivElement
const searchPanelEl = document.getElementById('search-panel') as HTMLDivElement
const llmPanelEl = document.getElementById('llm-panel') as HTMLDivElement
let searchPanelApiRef: SearchPanelApi | null = null
let llmDialogApiRef: LlmDialogApi | null = null

const iconPathMap: Record<string, string> = {
  'assets/search-icon.svg': searchIconUrl,
  'assets/llm-icon.svg': llmIconUrl,
  'assets/cluster-tree-icon.svg': clusterTreeIconUrl,
  'assets/filesystem-icon.svg': filesystemIconUrl
}

function createCmdButton(templateId?: string, iconSrc?: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'cmd-btn'
  btn.title = ''
  if (templateId) btn.dataset.templateId = templateId
  if (iconSrc) {
    const icon = document.createElement('img')
    icon.className = 'cmd-btn-icon'
    icon.src = iconSrc
    icon.alt = ''
    btn.appendChild(icon)
  }
  const del = document.createElement('span')
  del.className = 'cmd-delete'
  del.textContent = '−'
  btn.appendChild(del)
  return btn
}

function refreshCmdBarFullState(): void {
  const count = commandBar.querySelectorAll('.cmd-btn').length
  if (count >= MAX_CMD_BUTTONS) commandBar.dataset.full = 'true'
  else delete commandBar.dataset.full
}

let cmdEditMode = false
let longPressTimer: ReturnType<typeof setTimeout> | null = null
let suppressNextClick = false
const LONG_PRESS_MS = 500

function enterCmdEditMode(): void {
  if (cmdEditMode) return
  cmdEditMode = true
  commandBar.dataset.edit = 'true'
}

function exitCmdEditMode(): void {
  if (!cmdEditMode) return
  cmdEditMode = false
  delete commandBar.dataset.edit
}

function cmdBtnFromTarget(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof HTMLElement)) return null
  const btn = target.closest('.cmd-btn')
  return (btn as HTMLButtonElement) ?? null
}

function cancelLongPress(): void {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const CMD_DRAG_HOLD_MS = 200
const CMD_DRAG_MOVE = 6
const CMD_DRAG_SIZE = 70

const cmdDragSheet = new CSSStyleSheet()
cmdDragSheet.replaceSync(':root { --cmd-drag-x: 0px; --cmd-drag-y: 0px }')
document.adoptedStyleSheets = [...document.adoptedStyleSheets, cmdDragSheet]

let cmdPressTimer: number | null = null
let cmdPressBtn: HTMLButtonElement | null = null
let cmdPressPointerId: number | null = null
let cmdPressStartX = 0
let cmdPressStartY = 0

interface CmdDragState {
  btn: HTMLButtonElement
  pointerId: number
  offsetX: number
  offsetY: number
  lastX: number
}
let cmdDrag: CmdDragState | null = null

function cmdCancelPress(): void {
  if (cmdPressTimer !== null) {
    clearTimeout(cmdPressTimer)
    cmdPressTimer = null
  }
  cmdPressBtn = null
  cmdPressPointerId = null
}

function startCmdDrag(
  pointerId: number,
  btn: HTMLButtonElement,
  originX: number,
  originY: number,
  curX: number,
  curY: number
): void {
  cmdCancelPress()
  const rect = btn.getBoundingClientRect()
  btn.classList.add('cmd-dragging')
  btn.setPointerCapture(pointerId)
  const offsetX = originX - rect.left
  const offsetY = originY - rect.top
  cmdDrag = { btn, pointerId, offsetX, offsetY, lastX: curX }
  positionCmdDragged(curX, curY)
}

function positionCmdDragged(clientX: number, clientY: number): void {
  if (!cmdDrag) return
  cmdDrag.lastX = clientX
  const containerRect = commandBar.getBoundingClientRect()
  let x = clientX - cmdDrag.offsetX - containerRect.left
  let y = clientY - cmdDrag.offsetY - containerRect.top
  x = Math.max(0, Math.min(x, containerRect.width - CMD_DRAG_SIZE))
  y = Math.max(0, Math.min(y, containerRect.height - CMD_DRAG_SIZE))
  cmdDragSheet.replaceSync(':root { --cmd-drag-x: ' + x + 'px; --cmd-drag-y: ' + y + 'px }')
}

function endCmdDrag(): void {
  if (!cmdDrag) return
  const { btn, lastX } = cmdDrag
  const siblings = Array.from(commandBar.children).filter(
    (c): c is HTMLButtonElement => c !== btn && c.classList.contains('cmd-btn')
  )
  let target: HTMLButtonElement | null = null
  for (const sib of siblings) {
    const r = sib.getBoundingClientRect()
    if (lastX < r.left + r.width / 2) {
      target = sib
      break
    }
  }
  if (target) {
    commandBar.insertBefore(btn, target)
  } else {
    const addZone = commandBar.querySelector('.cmd-add-zone')
    if (addZone) commandBar.insertBefore(btn, addZone)
    else commandBar.appendChild(btn)
  }
  btn.classList.remove('cmd-dragging')
  cmdDrag = null
  suppressNextClick = true
  window.setTimeout(() => { suppressNextClick = false }, 0)
  refreshCmdBarFullState()
}

function setPanelButtonActive(activeTpl: string): void {
  const buttons = commandBar.querySelectorAll('.cmd-btn')
  for (const btn of buttons) {
    const el = btn as HTMLElement
    const tplId = el.dataset.templateId
    if (tplId === 'search' || tplId === 'filesystem' || tplId === 'llm-dialog') {
      if (tplId === activeTpl) el.dataset.active = 'true'
      else delete el.dataset.active
    }
  }
}

function saveActivePanel(panel: 'explorer' | 'search' | 'llm-dialog'): void {
  window.api.state
    .getSearchPanelState()
    .then((state) => {
      window.api.state
        .setSearchPanelState({
          activePanel: panel,
          expandedSearchFolders: state.expandedSearchFolders,
          lastSearchQuery: state.lastSearchQuery,
        })
        .catch(() => {})
    })
    .catch(() => {})
}

function showSearchPanel(): void {
  explorerPanel.hidden = true
  llmPanelEl.hidden = true
  searchPanelEl.hidden = false
  setPanelButtonActive('search')
  if (searchPanelApiRef) searchPanelApiRef.render()
  saveActivePanel('search')
}

function showExplorer(): void {
  searchPanelEl.hidden = true
  llmPanelEl.hidden = true
  explorerPanel.hidden = false
  setPanelButtonActive('filesystem')
  saveActivePanel('explorer')
}

function showLlmDialog(): void {
  explorerPanel.hidden = true
  searchPanelEl.hidden = true
  llmPanelEl.hidden = false
  setPanelButtonActive('llm-dialog')
  if (llmDialogApiRef) llmDialogApiRef.render()
  saveActivePanel('llm-dialog')
}

export function initCommandBar(deps: { searchPanelApi: SearchPanelApi; llmDialogApi: LlmDialogApi }): void {
  searchPanelApiRef = deps.searchPanelApi
  llmDialogApiRef = deps.llmDialogApi
  cmdAddBtn.addEventListener('click', async () => {
    const count = commandBar.querySelectorAll('.cmd-btn').length
    if (count >= MAX_CMD_BUTTONS) return
    try {
      const result = await window.api.editor.getAvailableButtonTemplates()
      const existingIds = Array.from(commandBar.querySelectorAll('.cmd-btn')).map(
        (b) => (b as HTMLElement).dataset.templateId ?? ''
      )
      const choice = await showButtonTemplateDialog(result.templates as ButtonTemplateChoice[], existingIds)
      if (!choice) return
      const iconSrc = iconPathMap[choice.iconPath]
      commandBar.insertBefore(createCmdButton(choice.id, iconSrc), cmdAddZone)
      refreshCmdBarFullState()
      const ids = Array.from(commandBar.querySelectorAll('.cmd-btn')).map(
        (b) => (b as HTMLElement).dataset.templateId ?? 'default'
      )
      try {
        await window.api.state.setCommandBarButtons(ids)
      } catch {
        // ignore persistence error
      }
    } catch (e) {
      alert((e as Error).message)
    }
  })

  refreshCmdBarFullState()

  const iconMap: Record<string, string> = {
    'search': searchIconUrl,
    'llm-dialog': llmIconUrl,
    'cluster-tree': clusterTreeIconUrl,
    'filesystem': filesystemIconUrl
  }
  commandBar.querySelectorAll('.cmd-btn').forEach((btn) => {
    const tplId = (btn as HTMLElement).dataset.templateId
    const icon = btn.querySelector('.cmd-btn-icon') as HTMLImageElement | null
    if (tplId && icon && iconMap[tplId]) icon.src = iconMap[tplId]
  })

  commandBar.addEventListener('mousedown', (e) => {
    const btn = cmdBtnFromTarget(e.target)
    if (!btn) return
    if (cmdEditMode) return
    if (longPressTimer) clearTimeout(longPressTimer)
    longPressTimer = setTimeout(() => {
      longPressTimer = null
      enterCmdEditMode()
      suppressNextClick = true
    }, LONG_PRESS_MS)
  })

  commandBar.addEventListener('mouseup', cancelLongPress)
  commandBar.addEventListener('mouseleave', cancelLongPress)

  commandBar.addEventListener('click', (e) => {
    if (suppressNextClick) {
      suppressNextClick = false
      return
    }
    const target = e.target as HTMLElement
    const del = target.closest('.cmd-delete')
    if (del) {
      e.stopPropagation()
      const btn = del.closest('.cmd-btn') as HTMLButtonElement | null
      if (btn) {
        btn.remove()
        refreshCmdBarFullState()
      }
    } else if (!cmdEditMode) {
      const btn = target.closest('.cmd-btn') as HTMLButtonElement | null
      if (btn) {
        const tplId = btn.dataset.templateId
        if (tplId === 'search') {
          showSearchPanel()
        } else if (tplId === 'filesystem') {
          showExplorer()
        } else if (tplId === 'llm-dialog') {
          showLlmDialog()
        }
      }
    }
  })

  document.addEventListener('mousedown', (e) => {
    if (!cmdEditMode) return
    const target = e.target as HTMLElement
    if (target.closest('.cmd-btn')) return
    exitCmdEditMode()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') exitCmdEditMode()
  })

  commandBar.addEventListener('pointerdown', (e: PointerEvent) => {
    if (!cmdEditMode) return
    if (e.button !== 0) return
    const btn = (e.target as HTMLElement).closest('.cmd-btn') as HTMLButtonElement | null
    if (!btn) return
    if ((e.target as HTMLElement).closest('.cmd-delete')) return

    cmdPressBtn = btn
    cmdPressPointerId = e.pointerId
    cmdPressStartX = e.clientX
    cmdPressStartY = e.clientY
    cmdPressTimer = window.setTimeout(() => {
      if (cmdPressBtn === btn && cmdEditMode) {
        startCmdDrag(e.pointerId, btn, cmdPressStartX, cmdPressStartY, cmdPressStartX, cmdPressStartY)
      }
    }, CMD_DRAG_HOLD_MS)
  })

  document.addEventListener('pointermove', (e: PointerEvent) => {
    if (cmdDrag) {
      if (e.pointerId !== cmdDrag.pointerId) return
      positionCmdDragged(e.clientX, e.clientY)
      return
    }
    if (cmdPressTimer !== null && cmdPressBtn && cmdPressPointerId === e.pointerId) {
      if (Math.hypot(e.clientX - cmdPressStartX, e.clientY - cmdPressStartY) > CMD_DRAG_MOVE) {
        startCmdDrag(e.pointerId, cmdPressBtn, cmdPressStartX, cmdPressStartY, e.clientX, e.clientY)
      }
    }
  })

  document.addEventListener('pointerup', (e: PointerEvent) => {
    if (cmdDrag) {
      if (e.pointerId !== cmdDrag.pointerId) return
      endCmdDrag()
    } else {
      cmdCancelPress()
    }
  })

  document.addEventListener('pointercancel', () => {
    if (cmdDrag) endCmdDrag()
    else cmdCancelPress()
  })

  window.api.state
    .getSearchPanelState()
    .then((state) => {
      if (state.activePanel === 'search') {
        explorerPanel.hidden = true
        llmPanelEl.hidden = true
        searchPanelEl.hidden = false
        setPanelButtonActive('search')
      } else if (state.activePanel === 'llm-dialog') {
        explorerPanel.hidden = true
        searchPanelEl.hidden = true
        llmPanelEl.hidden = false
        setPanelButtonActive('llm-dialog')
      }
    })
    .catch(() => {})
}
