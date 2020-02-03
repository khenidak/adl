/** JsonWebKey Key Type (kty), as defined in https://tools.ietf.org/html/draft-ietf-jose-json-web-algorithms-40. */
export enum JsonWebKeyType {
  /** Elliptic Curve. */
  Ec = 'EC',
  /** Elliptic Curve with a private key which is not exportable from the HSM. */
  EChyphenHsm = 'EC-HSM',
  /** RSA (https://tools.ietf.org/html/rfc3447) */
  Rsa = 'RSA',
  /** RSA with a private key which is not exportable from the HSM. */
  RsAhyphenHsm = 'RSA-HSM',
  /** Octet sequence (used to represent symmetric keys) */
  Oct = 'oct'
}
