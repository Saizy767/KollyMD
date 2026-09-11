interface LlmDialogDeps {}

export interface LlmDialogApi {
  render: () => void
  clear: () => void
  getLastQuery: () => string
}

interface ChatMessage {
  role: 'user'
  text: string
}

let panelEl: HTMLDivElement
let messagesEl: HTMLDivElement
let inputEl: HTMLInputElement
let sendBtn: HTMLButtonElement
let statusEl: HTMLSpanElement

let lastQuery = ''
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

function clear(): void {
  lastQuery = ''
  inputEl.value = ''
  messages.length = 0
  render()
}

function getLastQuery(): string {
  return lastQuery
}

function sendMessage(): void {
  const text = inputEl.value.trim()
  if (!text) return
  messages.push({ role: 'user', text })
  lastQuery = ''
  inputEl.value = ''
  renderMessages()
}

function buildPanelDom(): void {
  panelEl = document.getElementById('llm-panel') as HTMLDivElement
  panelEl.replaceChildren()

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

  inputEl.addEventListener('input', () => {
    lastQuery = inputEl.value
  })

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

export function initLlmDialog(deps: LlmDialogDeps): LlmDialogApi {
  void deps
  if (initialized) return { render, clear, getLastQuery }
  initialized = true
  buildPanelDom()
  render()
  return { render, clear, getLastQuery }
}
