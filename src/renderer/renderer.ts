/// <reference path="./env.d.ts" />

const selectDirBtn = document.getElementById('select-dir') as HTMLButtonElement
const vaultPathEl = document.getElementById('vault-path') as HTMLSpanElement
const refreshBtn = document.getElementById('refresh-explorer') as HTMLButtonElement
const explorerTree = document.getElementById('explorer-tree') as HTMLUListElement
const explorerStatus = document.getElementById('explorer-status') as HTMLSpanElement

async function loadCurrentVault(): Promise<void> {
  try {
    const vault = await window.api.vault.getCurrentVault()
    if (vault) {
      vaultPathEl.textContent = vault.rootPath
      await loadExplorer()
    } else {
      vaultPathEl.textContent = 'No vault selected'
      explorerStatus.textContent = 'No vault selected'
    }
  } catch (e) {
    vaultPathEl.textContent = '[Error: ' + (e as Error).message + ']'
  }
}

async function loadExplorer(): Promise<void> {
  refreshBtn.textContent = 'Loading...'
  refreshBtn.disabled = true
  explorerStatus.textContent = ''
  try {
    const entries = await window.api.vault.listNotes()
    explorerTree.innerHTML = ''
    if (entries.length === 0) {
      explorerStatus.textContent = 'Vault is empty'
    } else {
      explorerTree.appendChild(renderTree(entries))
      explorerStatus.textContent = entries.length + ' top-level entries'
    }
  } catch (e) {
    explorerStatus.textContent = '[Error: ' + (e as Error).message + ']'
  } finally {
    refreshBtn.textContent = 'Refresh'
    refreshBtn.disabled = false
  }
}

function renderTree(entries: NoteEntryDto[]): HTMLUListElement {
  const ul = document.createElement('ul')
  for (const entry of entries) {
    ul.appendChild(renderEntry(entry))
  }
  return ul
}

function renderEntry(entry: NoteEntryDto): HTMLLIElement {
  const li = document.createElement('li')

  if (entry.isDirectory) {
    const toggle = document.createElement('button')
    toggle.textContent = '[-] ' + entry.name
    const childUl = renderTree(entry.children)
    childUl.hidden = false

    toggle.addEventListener('click', () => {
      const collapsed = !childUl.hidden
      childUl.hidden = collapsed
      toggle.textContent = (collapsed ? '[+]' : '[-]') + ' ' + entry.name
    })

    li.appendChild(toggle)
    li.appendChild(childUl)
  } else {
    const span = document.createElement('span')
    span.textContent = entry.name
    span.addEventListener('click', () => {
      alert(entry.path)
    })
    li.appendChild(span)
  }

  return li
}

selectDirBtn.addEventListener('click', async () => {
  selectDirBtn.textContent = 'Loading...'
  selectDirBtn.disabled = true
  try {
    const vault = await window.api.vault.openVault()
    if (vault) {
      vaultPathEl.textContent = vault.rootPath
      await loadExplorer()
    }
  } catch (e) {
    alert((e as Error).message)
  } finally {
    selectDirBtn.textContent = 'Select Directory'
    selectDirBtn.disabled = false
  }
})

refreshBtn.addEventListener('click', () => {
  loadExplorer()
})

loadCurrentVault()
