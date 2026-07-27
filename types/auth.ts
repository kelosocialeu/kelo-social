export interface AtpSession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  pdsUrl: string;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  pdsUrl: string;
}

export interface PdsProvider {
  id: string;
  label: string;
  url: string;
}
