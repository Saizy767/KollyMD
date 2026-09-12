import { showButtonTemplateDialog, type ButtonTemplateChoice } from '../ui/button-template-dialog'
import type { ModRegistry } from '../mods/registry'

const commandBar = document.getElementById('command-bar') as HTMLDivElement
const cmdAddBtn = document.querySelector('.cmd-add') as HTMLButtonElement
const cmdAddZone = document.querySelector('.cmd-add-zone') as HTMLDivElement
const MAX_CMD_BUTTONS = 6

let buttonRegistry: ReturnType<ModRegistry['getButtonRegistry']>

function createCmdButton(modId: string, iconSrc?: string): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = 'cmd-btn'
  btn.title = ''
  btn.dataset.modId = modId
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

function persistCommandBarButtons(): void {
  const ids = Array.from(commandBar.querySelectorAll('.cmd-btn'))
    .map((b) => (b as HTMLElement).dataset.modId ?? '')
    .filter((id) => id.length > 0)
  window.api.state.setCommandBarButtons(ids).catch(() => {})
}

function updateActiveHighlight(activeModId: string | null): void {
  const buttons = commandBar.querySelectorAll('.cmd-btn')
  for (const btn of buttons) {
    const el = btn as HTMLElement
    if (el.dataset.modId === activeModId) el.dataset.active = 'true'
    else delete el.dataset.active
  }
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

export function initCommandBar(registry: ModRegistry): void {
  buttonRegistry = registry.getButtonRegistry()

  cmdAddBtn.addEventListener('click', async () => {
    const count = commandBar.querySelectorAll('.cmd-btn').length
    if (count >= MAX_CMD_BUTTONS) return
    try {
      const allMods = buttonRegistry.getRegisteredModules()
      const choices: ButtonTemplateChoice[] = allMods.map((m) => ({
        id: m.manifest.id,
        name: m.manifest.label,
        description: m.manifest.description ?? '',
        iconPath: m.manifest.iconPath ?? '',
      }))
      const existingIds = Array.from(commandBar.querySelectorAll('.cmd-btn')).map(
        (b) => (b as HTMLElement).dataset.modId ?? ''
      )
      const choice = await showButtonTemplateDialog(choices, existingIds)
      if (!choice) return
      const mod = allMods.find((m) => m.manifest.id === choice.id)
      commandBar.insertBefore(createCmdButton(choice.id, mod?.manifest.iconPath), cmdAddZone)
      refreshCmdBarFullState()
      persistCommandBarButtons()
    } catch (e) {
      alert((e as Error).message)
    }
  })

  refreshCmdBarFullState()

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
        persistCommandBarButtons()
      }
    } else if (!cmdEditMode) {
      const btn = target.closest('.cmd-btn') as HTMLButtonElement | null
      if (btn) {
        const modId = btn.dataset.modId
        if (modId) {
          try {
            buttonRegistry.setActive(modId)
            updateActiveHighlight(modId)
          } catch {
            // mod not found — ignore
          }
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
}

export async function renderCommandBarButtons(registry: ModRegistry): Promise<void> {
  const br = registry.getButtonRegistry()
  const allMods = br.getRegisteredModules()

  let enabledIds: string[]
  try {
    enabledIds = await window.api.state.getCommandBarButtons()
  } catch {
    enabledIds = []
  }
  if (enabledIds.length === 0) {
    enabledIds = allMods.map((m) => m.manifest.id)
  }

  for (const id of enabledIds) {
    const mod = allMods.find((m) => m.manifest.id === id)
    if (!mod) continue
    const btn = createCmdButton(mod.manifest.id, mod.manifest.iconPath)
    commandBar.insertBefore(btn, cmdAddZone)
  }
  refreshCmdBarFullState()

  try {
    const state = await window.api.state.getSearchPanelState()
    const activeId = state.activePanel
    if (activeId && allMods.some((m) => m.manifest.id === activeId)) {
      br.setActive(activeId)
      updateActiveHighlight(activeId)
    } else {
      const firstMod = allMods[0]
      if (firstMod) {
        br.setActive(firstMod.manifest.id)
        updateActiveHighlight(firstMod.manifest.id)
      }
    }
  } catch {
    const firstMod = allMods[0]
    if (firstMod) {
      try {
        br.setActive(firstMod.manifest.id)
        updateActiveHighlight(firstMod.manifest.id)
      } catch {
        // no mods available
      }
    }
  }
}
