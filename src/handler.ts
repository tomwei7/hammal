import { TokenProvider } from './token'
import { Backend } from './backend'

const PROXY_HEADER_ALLOW_LIST: string[] = ["accept", "user-agent", "accept-encoding"]

const ORG_NAME_BACKEND:{ [key: string]: string; } = {
  "gcr": "https://gcr.io",
  "k8sgcr": "https://k8s.gcr.io",
  "quay": "https://quay.io",
}

const DEFAULT_BACKEND_HOST: string = "https://registry-1.docker.io"

export async function handleRequest(request: Request): Promise<Response> {
  return handleRegistryRequest(request)
}

function copyProxyHeaders(inputHeaders: Headers) : Headers {
  const headers = new Headers;
  for(const pair of inputHeaders.entries()) {
    if (pair[0].toLowerCase() in PROXY_HEADER_ALLOW_LIST) {
      headers.append(pair[0], pair[1])
    }
  }
  return headers
}

function orgNameFromPath(pathname: string): string|null {
  const splitedPath: string[] = pathname.split("/", 3)
  if (splitedPath.length === 3 && splitedPath[0] === "" && splitedPath[1] === "v2") {
    return splitedPath[2].toLowerCase()
  }
  return null
}

function hostByOrgName(orgName: string|null): string {
  if (orgName !== null && orgName in ORG_NAME_BACKEND) {
    return ORG_NAME_BACKEND[orgName]
  }
  return DEFAULT_BACKEND_HOST
}

function rewritePathByOrg(orgName: string|null, pathname: string): string {
  if (orgName === null || !(orgName in ORG_NAME_BACKEND)) {
    return pathname
  }
  const splitedPath: string[] = pathname.split("/")
  const cleanSplitedPath = splitedPath.filter(function(value: string, index: number) {
    return value !== orgName || index !== 2;
  })
  return cleanSplitedPath.join("/")
}

async function handleRegistryRequest(request: Request): Promise<Response> {
  const reqURL = new URL(request.url)
  const orgName = orgNameFromPath(reqURL.pathname)
  const pathname = rewritePathByOrg(orgName, reqURL.pathname)
  const host = hostByOrgName(orgName)
  const tokenProvider = new TokenProvider()
  const backend = new Backend(host, tokenProvider)
  const headers = copyProxyHeaders(request.headers)
  return backend.proxy(pathname, {headers: request.headers})
}
