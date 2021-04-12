import { TokenProvider, Token } from './token'

interface ProxyArgs {
  headers: Headers
}

class Backend {
  private host: string;
  private tokenProvider: TokenProvider|undefined;

  constructor(host: string, tokenProvider?: TokenProvider) {
    this.host = host;
    this.tokenProvider = tokenProvider
  }

  async proxy(pathname: string, args: ProxyArgs): Promise<Response> {
    const url = new URL(this.host)
    url.pathname = pathname
    const response = await fetch(url.toString(), {method: "GET", headers:args.headers, redirect: "follow"})
    if (this.tokenProvider === undefined) {
      return response
    }
    if (response.status !== 401) {
      return response
    }

    const authenticateStr = response.headers.get("Www-Authenticate")
    if (authenticateStr === null || this.tokenProvider === undefined) {
      return response
    }
    const token: Token = await this.tokenProvider.token(authenticateStr)
    const authenticatedHeaders = new Headers(args.headers)
    authenticatedHeaders.append("Authorization", `Bearer ${token.token}`)
    return await fetch(url.toString(), {method: "GET", headers:authenticatedHeaders, redirect: "follow"})
  }
}

export {Backend}
