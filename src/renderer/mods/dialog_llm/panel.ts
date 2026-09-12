import './panel.css'

export interface LlmDialogHandle {
  showPanel: () => void
  hidePanel: () => void
  restoreState: () => Promise<void>
}

interface ChatMessage {
  role: 'user'
  text: string
}

let modId: string
let panelEl: HTMLDivElement
let messagesEl: HTMLDivElement
let inputEl: HTMLInputElement
let sendBtn: HTMLButtonElement
let statusEl: HTMLSpanElement

const messages: ChatMessage[] = []
let initialized = false

function renderMessages(): void {
  messagesEl.replaceChildren()
  if (messages.length === 0) {
    const placeholder = document.createElement('div')
    placeholder.className = 'llm-dialog-placeholder'
    placeholder.textContent = 'No messages yet. Type a question below.'
    messagesEl.appendChild(placeholder)
    return
  }
  for (const msg of messages) {
    const bubble = document.createElement('div')
    bubble.className = 'llm-dialog-message llm-dialog-message-' + msg.role
    bubble.textContent = msg.text
    messagesEl.appendChild(bubble)
  }
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function render(): void {
  renderMessages()
  statusEl.textContent = ''
}

function sendMessage(): void {
  const text = inputEl.value.trim()
  if (!text) return
  messages.push({ role: 'user', text })
  inputEl.value = ''
  renderMessages()
}

function hidePanel(): void {
  panelEl.hidden = true
}

function showPanel(): void {
  panelEl.hidden = false
  render()
  window.api.state
    .getSearchPanelState()
    .then((state) => {
      window.api.state
        .setSearchPanelState({
          activePanel: modId,
          expandedSearchFolders: state.expandedSearchFolders,
          lastSearchQuery: state.lastSearchQuery,
        })
        .catch(() => {})
    })
    .catch(() => {})
}

function buildPanelDom(): void {
  panelEl = document.createElement('div')
  panelEl.id = 'llm-panel'
  panelEl.hidden = true

  const footer = document.getElementById('sidebar-footer')
  if (footer) {
    footer.before(panelEl)
  } else {
    document.getElementById('sidebar')?.appendChild(panelEl)
  }

  messagesEl = document.createElement('div')
  messagesEl.id = 'llm-dialog-messages'

  statusEl = document.createElement('span')
  statusEl.className = 'llm-dialog-status'

  const inputBar = document.createElement('div')
  inputBar.className = 'llm-dialog-input-bar'

  inputEl = document.createElement('input')
  inputEl.id = 'llm-dialog-input'
  inputEl.type = 'text'
  inputEl.placeholder = 'Ask anything...'

  sendBtn = document.createElement('button')
  sendBtn.id = 'llm-dialog-send'
  sendBtn.textContent = 'Send'

  inputBar.appendChild(inputEl)
  inputBar.appendChild(sendBtn)

  panelEl.appendChild(messagesEl)
  panelEl.appendChild(statusEl)
  panelEl.appendChild(inputBar)

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    }
  })

  sendBtn.addEventListener('click', () => {
    sendMessage()
  })
}

async function restoreState(): Promise<void> {
  // Panel visibility is managed by ButtonRegistry.setActive().
}

export function initLlmDialog(id: string): LlmDialogHandle {
  if (initialized) return { showPanel, hidePanel, restoreState }
  initialized = true
  modId = id
  buildPanelDom()
  render()
  return { showPanel, hidePanel, restoreState }
}
