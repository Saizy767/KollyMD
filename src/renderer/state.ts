let vaultRootPath: string | null = null
let selectedFolder: string | null = null
const expandedFolders = new Set<string>()
const nodeMap = new Map<string, HTMLLIElement>()
let activeDocId: string | null = null
let displayPath = ''

export function getVaultRootPath(): string | null { return vaultRootPath }
export function setVaultRootPath(v: string | null): void { vaultRootPath = v }
export function getSelectedFolder(): string | null { return selectedFolder }
export function setSelectedFolder(v: string | null): void { selectedFolder = v }
export function getExpandedFolders(): Set<string> { return expandedFolders }
export function getNodeMap(): Map<string, HTMLLIElement> { return nodeMap }
export function getActiveDocId(): string | null { return activeDocId }
export function setActiveDocId(v: string | null): void { activeDocId = v }
export function getDisplayPath(): string { return displayPath }
export function setDisplayPath(v: string): void { displayPath = v }
