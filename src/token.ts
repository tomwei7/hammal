interface WwwAuthenticate {
  realm: string
  service: string
  scope: string
}

interface Token {
  token: string
  expires_in: number
}

function parseAuthenticateStr(authenticateStr: string): WwwAuthenticate {
  const bearer = authenticateStr.split(/\s+/, 2)
  if (bearer.length != 2 && bearer[0].toLowerCase() !== "bearer") {
    throw new Error(`Invalid Www-Authenticate ${authenticateStr}`)
  }
  const params = bearer[1].split(",")
  let get_param = function(name: string): string {
    for(const param of params) {
      const kvPair = param.split("=", 2)
      if (kvPair.length !== 2 || kvPair[0] !== name) {
        continue
      }
      return kvPair[1].replace(/['"]+/g, '')
    }
    return ""
  }
  return {
    realm: get_param("realm"),
    service: get_param("service"),
    scope: get_param("scope"),
  };
}

class TokenProvider {
  private username: string|undefined;
  private password: string|undefined;

  constructor(username?: string, password?: string) {
    this.username = username;
    this.password = password;
  }

  private async authenticateCacheKey(wwwAuthenticate: WwwAuthenticate): Promise<string> {
    const keyStr = `${this.username}:${this.password}/${wwwAuthenticate.realm}/${wwwAuthenticate.service}/${wwwAuthenticate.scope}`
    const keyStrText = new TextEncoder().encode(keyStr)
    const digestArray = await crypto.subtle.digest({name: "SHA-256"}, keyStrText)
    const digestUint8Array = new Uint8Array(digestArray);
    let hexArray = []
    for(const num of digestUint8Array) {
      hexArray.push(num.toString(16))
    }
    const digestHex = hexArray.join('')
    return `token/${digestHex}`
  }

  private async tokenFromCache(cacheKey: string): Promise<Token|null> {
    const value = await HAMMAL_CACHE.get(cacheKey)
    if (value === null) {
      return null
    }
    return JSON.parse(value)
  }

  private async tokenToCache(cacheKey: string, token: Token) {
    await HAMMAL_CACHE.put(cacheKey, JSON.stringify(token), {expirationTtl: token.expires_in})
  }

  private async fetchToken(wwwAuthenticate: WwwAuthenticate): Promise<Token> {
    const url = new URL(wwwAuthenticate.realm)
    if (wwwAuthenticate.service.length) {
      url.searchParams.set("service", wwwAuthenticate.service)
    }
    if (wwwAuthenticate.scope.length) {
      url.searchParams.set("scope", wwwAuthenticate.scope)
    }
    // TODO: support basic auth
    const response = await fetch(url.toString(), {method: "GET", headers: {}})
    if (response.status !== 200) {
      throw new Error(`Unable to fetch token from ${url.toString()} status code ${response.status}`)
    }
    const body = await response.json()
    return {token: body.token, expires_in: body.expires_in}
  }

  async token(authenticateStr: string): Promise<Token> {
    const wwwAuthenticate: WwwAuthenticate = parseAuthenticateStr(authenticateStr)
    const cacheKey = await this.authenticateCacheKey(wwwAuthenticate)
    const cachedToken: Token|null = await this.tokenFromCache(cacheKey)
    if (cachedToken !== null) {
      return cachedToken
    }
    const token: Token = await this.fetchToken(wwwAuthenticate)
    await this.tokenToCache(cacheKey, token)
    return token
  }
}

export { TokenProvider, Token }
