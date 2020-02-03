/** */
export enum KeyUsageType {
  DigitalSignature = 'digitalSignature',
  NonRepudiation = 'nonRepudiation',
  KeyEncipherment = 'keyEncipherment',
  DataEncipherment = 'dataEncipherment',
  KeyAgreement = 'keyAgreement',
  KeyCertSign = 'keyCertSign',
  CRlSign = 'cRLSign',
  EncipherOnly = 'encipherOnly',
  DecipherOnly = 'decipherOnly'
}
