/** JSON web key operations. For more information, see JsonWebKeyOperation. */
export enum JsonWebKeyOperation {
  Encrypt = 'encrypt',
  Decrypt = 'decrypt',
  Sign = 'sign',
  Verify = 'verify',
  WrapKey = 'wrapKey',
  UnwrapKey = 'unwrapKey'
}
