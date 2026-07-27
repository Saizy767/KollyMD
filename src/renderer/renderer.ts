const selectDirBtn = document.getElementById('select-dir') as HTMLButtonElement
const vaultPathEl = document.getElementById('vault-path') as HTMLSpanElement

async function loadCurrentVault(): Promise<void> {
  try {
    const vault = await window.api.vault.getCurrentVault()
    if (vault) {
      vaultPathEl.textContent = vault.rootPath
    } else {
      vaultPathEl.textContent = 'No vault selected'
    }
  } catch (e) {
    vaultPathEl.textContent = '[Error: ' + (e as Error).message + ']'
  }
}

selectDirBtn.addEventListener('click', async () => {
  selectDirBtn.textContent = 'Loading...'
  selectDirBtn.disabled = true
  try {
    const vault = await window.api.vault.openVault()
    if (vault) {
      vaultPathEl.textContent = vault.rootPath
    }
  } catch (e) {
    alert((e as Error).message)
  } finally {
    selectDirBtn.textContent = 'Select Directory'
    selectDirBtn.disabled = false
  }
})

loadCurrentVault()
