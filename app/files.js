export const maxBytes = 10 * 1024 * 1024
export const maxFiles = 4
export const accept = '.pdf,.ppt,.pptx,.doc,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp,.gif'
export function supportedFile(file) {
  return accept.split(',').includes('.' + file.name.split('.').at(-1).toLowerCase())
}

let database
function openDatabase() {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('studyroom', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('workspace')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return database
}
export async function readWorkspace() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction('workspace').objectStore('workspace').get('state')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
export async function saveWorkspace(value) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('workspace', 'readwrite')
    tx.objectStore('workspace').put(value, 'state')
    tx.oncomplete = resolve
    tx.onabort = () => reject(tx.error)
  })
}
