import searchIconUrl from '../assets/search-icon.svg'
import llmIconUrl from '../assets/llm-icon.svg'
import clusterTreeIconUrl from '../assets/cluster-tree-icon.svg'
import filesystemIconUrl from '../assets/filesystem-icon.svg'

const iconMap: Record<string, string> = {
  'assets/search-icon.svg': searchIconUrl,
  'assets/llm-icon.svg': llmIconUrl,
  'assets/cluster-tree-icon.svg': clusterTreeIconUrl,
  'assets/filesystem-icon.svg': filesystemIconUrl
}

export interface ButtonTemplateChoice {
  id: string
  name: string
  description: string
  iconPath: string
  action: string
}

let dialogResolve: ((value: ButtonTemplateChoice | null) => void) | null = null
let dialogEl: HTMLDivElement | null = null

function closeDialog(result: ButtonTemplateChoice | null): void {
  if (dialogEl) {
    document.body.removeChild(dialogEl)
    dialogEl = null
  }
  document.removeEventListener('keydown', onKeyDown)
  if (dialogResolve) {
    const r = dialogResolve
    dialogResolve = null
    r(result)
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeDialog(null)
  }
}

export function showButtonTemplateDialog(
  templates: ButtonTemplateChoice[],
  existingIds: string[] = []
): Promise<ButtonTemplateChoice | null> {
  return new Promise((resolve) => {
    dialogResolve = resolve

    dialogEl = document.createElement('div')
    dialogEl.id = 'button-template-dialog'

    const box = document.createElement('div')
    box.id = 'button-template-box'

    const title = document.createElement('span')
    title.id = 'button-template-title'
    title.textContent = 'Выберите тип кнопки'
    box.appendChild(title)

    const grid = document.createElement('div')
    grid.id = 'button-template-grid'

    for (const tpl of templates) {
      const card = document.createElement('div')
      card.className = 'button-template-card'
      card.dataset.id = tpl.id

      const icon = document.createElement('img')
      icon.className = 'button-template-icon'
      icon.src = iconMap[tpl.iconPath] ?? ''
      icon.alt = tpl.name
      card.appendChild(icon)

      const name = document.createElement('span')
      name.className = 'button-template-name'
      name.textContent = tpl.name
      card.appendChild(name)

      const desc = document.createElement('span')
      desc.className = 'button-template-desc'
      desc.textContent = tpl.description
      card.appendChild(desc)

      if (existingIds.includes(tpl.id)) {
        card.classList.add('button-template-card-disabled')
        const badge = document.createElement('span')
        badge.className = 'button-template-badge'
        badge.textContent = 'Уже на панели'
        card.appendChild(badge)
      } else {
        card.addEventListener('click', () => closeDialog(tpl))
      }

      grid.appendChild(card)
    }

    box.appendChild(grid)

    const closeBtn = document.createElement('button')
    closeBtn.id = 'button-template-close'
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', () => closeDialog(null))
    box.appendChild(closeBtn)

    dialogEl.appendChild(box)
    dialogEl.addEventListener('click', (e) => {
      if (e.target === dialogEl) closeDialog(null)
    })

    document.addEventListener('keydown', onKeyDown)
    document.body.appendChild(dialogEl)
  })
}
