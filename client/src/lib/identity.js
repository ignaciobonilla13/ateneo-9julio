import { newId } from '@shared/text.js'

const ID_KEY = 'paglu.participantId'
const SECRET_KEY = 'paglu.secret'
const TOKEN_KEY = 'paglu.presenterToken'

let memoryIdentity = null

export function loadIdentity() {
  if (memoryIdentity) return memoryIdentity
  try {
    const participantId = localStorage.getItem(ID_KEY)
    const secret = localStorage.getItem(SECRET_KEY)
    if (participantId && secret) {
      memoryIdentity = { participantId, secret }
      return memoryIdentity
    }
  } catch {
    /* el modo privado sigue en memoria */
  }
  const participantId = newId()
  const secret = `${newId()}${newId()}`.replace(/-/g, '')
  memoryIdentity = { participantId, secret }
  try {
    localStorage.setItem(ID_KEY, participantId)
    localStorage.setItem(SECRET_KEY, secret)
  } catch {
    /* sin almacenamiento, vale para esta pestaña */
  }
  return memoryIdentity
}

export function rotateIdentity() {
  memoryIdentity = null
  try {
    localStorage.removeItem(ID_KEY)
    localStorage.removeItem(SECRET_KEY)
  } catch {
    /* ignore */
  }
  return loadIdentity()
}

export function loadToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}
