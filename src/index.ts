import { handleRequest } from './handler'

declare global {
  const HAMMAL_CACHE: KVNamespace
}

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})
