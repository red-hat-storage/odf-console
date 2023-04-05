/* External Ceph Stoarge State */

export type RHCSState = {
  fileData: string;
  errorMessage: boolean;
  isLoading: boolean;
  fileName: string;
};

export type ExternalCephState = RHCSState | {};

export type ExternalCephStateValues = ValuesOfUnion<ExternalCephState>;

export type ExternalCephStateKeys = KeysOfUnion<ExternalCephState>;

type ValuesOfUnion<T> = T extends T ? T[keyof T] : never;

type KeysOfUnion<T> = T extends T ? keyof T : never;
