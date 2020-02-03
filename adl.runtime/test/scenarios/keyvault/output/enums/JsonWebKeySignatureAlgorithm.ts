/** The signing/verification algorithm identifier. For more information on possible algorithm types, see JsonWebKeySignatureAlgorithm. */
export enum JsonWebKeySignatureAlgorithm {
  /** RSASSA-PSS using SHA-256 and MGF1 with SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
  Ps256 = 'PS256',
  /** RSASSA-PSS using SHA-384 and MGF1 with SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
  Ps384 = 'PS384',
  /** RSASSA-PSS using SHA-512 and MGF1 with SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
  Ps512 = 'PS512',
  /** RSASSA-PKCS1-v1_5 using SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
  Rs256 = 'RS256',
  /** RSASSA-PKCS1-v1_5 using SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
  Rs384 = 'RS384',
  /** RSASSA-PKCS1-v1_5 using SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
  Rs512 = 'RS512',
  /** Reserved */
  Rsnull = 'RSNULL',
  /** ECDSA using P-256 and SHA-256, as described in https://tools.ietf.org/html/rfc7518. */
  Es256 = 'ES256',
  /** ECDSA using P-384 and SHA-384, as described in https://tools.ietf.org/html/rfc7518 */
  Es384 = 'ES384',
  /** ECDSA using P-521 and SHA-512, as described in https://tools.ietf.org/html/rfc7518 */
  Es512 = 'ES512',
  /** ECDSA using P-256K and SHA-256, as described in https://tools.ietf.org/html/rfc7518 */
  Es256K = 'ES256K'
}
