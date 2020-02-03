/** Elliptic curve name. For valid values, see JsonWebKeyCurveName. */
export enum JsonWebKeyCurveName {
  /** The NIST P-256 elliptic curve, AKA SECG curve SECP256R1. */
  Phyphen256 = 'P-256',
  /** The NIST P-384 elliptic curve, AKA SECG curve SECP384R1. */
  Phyphen384 = 'P-384',
  /** The NIST P-521 elliptic curve, AKA SECG curve SECP521R1. */
  Phyphen521 = 'P-521',
  /** The SECG SECP256K1 elliptic curve. */
  Phyphen256K = 'P-256K'
}
