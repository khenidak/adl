/** Reflects the deletion recovery level currently in effect for keys in the current vault. If it contains 'Purgeable' the key can be permanently deleted by a privileged user; otherwise, only the system can purge the key, at the end of the retention interval. */
export enum DeletionRecoveryLevel {
  Purgeable = 'Purgeable',
  RecoverableplusSignPurgeable = 'Recoverable+Purgeable',
  Recoverable = 'Recoverable',
  RecoverableplusSignProtectedSubscription = 'Recoverable+ProtectedSubscription'
}
