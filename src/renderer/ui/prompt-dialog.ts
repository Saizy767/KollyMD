const promptDialog = document.getElementById('prompt-dialog') as HTMLDivElement
const promptMessage = document.getElementById('prompt-message') as HTMLSpanElement
const promptInput = document.getElementById('prompt-input') as HTMLInputElement
const promptOk = document.getElementById('prompt-ok') as HTMLButtonElement
const promptCancel = document.getElementById('prompt-cancel') as HTMLButtonElement

let promptResolve: ((value: string | null) => void) | null = null

function closePrompt(result: string | null): void {
  promptDialog.hidden = true
  if (promptResolve) {
    const r = promptResolve
    promptResolve = null
    r(result)
  }
}

export function customPrompt(message: string, defaultValue: string): Promise<string | null> {
  return new Promise((resolve) => {
    promptResolve = resolve
    promptMessage.textContent = message
    promptInput.value = defaultValue
    promptDialog.hidden = false
    promptInput.focus()
    promptInput.select()
  })
}

promptOk.addEventListener('click', () => closePrompt(promptInput.value))
promptCancel.addEventListener('click', () => closePrompt(null))
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    closePrompt(promptInput.value)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    closePrompt(null)
  }
})
