/**
 * Découverte automatique de l'identité et du PDS d'un compte AT Protocol.
 *
 * Fonctionnement :
 * 1. Nettoie le handle ou le DID saisi.
 * 2. Résout le handle vers un DID.
 * 3. Résout le document DID.
 * 4. Extrait le service AT Protocol #atproto_pds.
 */

export class AtprotoDiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtprotoDiscoveryError";
  }
}

interface DidService {
  id: string;
  type: string | string[];
  serviceEndpoint: string | Record<string, unknown>;
}

interface DidDocument {
  id: string;
  alsoKnownAs?: string[];
  service?: DidService[];
}

export interface DiscoveredAccount {
  identifier: string;
  did: string;
  pdsUrl: string;
}

const HANDLE_RESOLVER_URL =
  "https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle";

const PLC_DIRECTORY_URL = "https://plc.directory";

/**
 * Nettoie un identifiant saisi par l'utilisateur.
 *
 * Exemples :
 * "@alice.wsocial.eu" devient "alice.wsocial.eu"
 * " alice.wsocial.eu " devient "alice.wsocial.eu"
 */
export function normalizeIdentifier(identifier: string): string {
  const normalized = identifier.trim().replace(/^@/, "").toLowerCase();

  if (!normalized) {
    throw new AtprotoDiscoveryError(
      "Veuillez saisir votre identifiant AT Protocol."
    );
  }

  return normalized;
}

/**
 * Résout un handle AT Protocol vers un DID.
 *
 * La résolution HTTPS /.well-known/atproto-did est tentée en premier.
 * Le résolveur public AT Protocol est utilisé en secours, notamment pour
 * les handles reposant sur un enregistrement DNS TXT.
 */
export async function resolveHandleToDid(handle: string): Promise<string> {
  const normalizedHandle = normalizeIdentifier(handle);

  if (normalizedHandle.startsWith("did:")) {
    return normalizedHandle;
  }

  const didFromWellKnown = await resolveHandleWithWellKnown(normalizedHandle);

  if (didFromWellKnown) {
    return didFromWellKnown;
  }

  return resolveHandleWithPublicResolver(normalizedHandle);
}

/**
 * Essaie de résoudre le handle avec :
 * https://handle/.well-known/atproto-did
 */
async function resolveHandleWithWellKnown(
  handle: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://${handle}/.well-known/atproto-did`,
      {
        method: "GET",
        headers: {
          Accept: "text/plain",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!response.ok) {
      return null;
    }

    const did = (await response.text()).trim();

    return isSupportedDid(did) ? did : null;
  } catch {
    return null;
  }
}

/**
 * Résout un handle en utilisant le point d'accès public AT Protocol.
 *
 * Ce mécanisme permet également de résoudre les handles configurés
 * uniquement avec un enregistrement DNS TXT.
 */
async function resolveHandleWithPublicResolver(
  handle: string
): Promise<string> {
  let response: Response;

  try {
    const url = new URL(HANDLE_RESOLVER_URL);
    url.searchParams.set("handle", handle);

    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AtprotoDiscoveryError(
      "Impossible de contacter le service de résolution AT Protocol."
    );
  }

  if (!response.ok) {
    throw new AtprotoDiscoveryError(
      `L'identifiant « ${handle} » est introuvable sur l'AT Protocol.`
    );
  }

  const data = (await response.json()) as { did?: unknown };

  if (typeof data.did !== "string" || !isSupportedDid(data.did)) {
    throw new AtprotoDiscoveryError(
      "Le service de résolution a retourné un DID invalide."
    );
  }

  return data.did;
}

/**
 * Résout un document DID.
 *
 * Méthodes actuellement prises en charge :
 * - did:plc
 * - did:web
 */
export async function resolveDidDocument(
  did: string
): Promise<DidDocument> {
  let didDocumentUrl: string;

  if (did.startsWith("did:plc:")) {
    didDocumentUrl = `${PLC_DIRECTORY_URL}/${encodeURIComponent(did)}`;
  } else if (did.startsWith("did:web:")) {
    didDocumentUrl = buildDidWebDocumentUrl(did);
  } else {
    throw new AtprotoDiscoveryError(
      `La méthode DID utilisée par « ${did} » n'est pas prise en charge.`
    );
  }

  let response: Response;

  try {
    response = await fetch(didDocumentUrl, {
      method: "GET",
      headers: {
        Accept: "application/did+ld+json, application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AtprotoDiscoveryError(
      "Impossible de récupérer le document DID du compte."
    );
  }

  if (!response.ok) {
    throw new AtprotoDiscoveryError(
      `Le document DID n'a pas pu être récupéré (${response.status}).`
    );
  }

  const document = (await response.json()) as DidDocument;

  if (!document || document.id !== did) {
    throw new AtprotoDiscoveryError(
      "Le document DID retourné ne correspond pas au compte demandé."
    );
  }

  return document;
}

/**
 * Convertit un DID Web en URL de document DID.
 *
 * did:web:example.com
 * devient
 * https://example.com/.well-known/did.json
 *
 * did:web:example.com:users:alice
 * devient
 * https://example.com/users/alice/did.json
 */
function buildDidWebDocumentUrl(did: string): string {
  const methodSpecificId = did.slice("did:web:".length);

  if (!methodSpecificId) {
    throw new AtprotoDiscoveryError("Le DID Web est invalide.");
  }

  const parts = methodSpecificId.split(":").map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      throw new AtprotoDiscoveryError("Le DID Web est invalide.");
    }
  });

  const host = parts.shift();

  if (!host) {
    throw new AtprotoDiscoveryError("Le DID Web ne contient aucun domaine.");
  }

  if (parts.length === 0) {
    return `https://${host}/.well-known/did.json`;
  }

  const path = parts.map(encodeURIComponent).join("/");
  return `https://${host}/${path}/did.json`;
}

/**
 * Extrait l'adresse du PDS depuis le document DID.
 */
export function extractPdsUrl(document: DidDocument): string {
  const service = document.service?.find((entry) => {
    const hasCorrectId =
      entry.id === "#atproto_pds" ||
      entry.id.endsWith("#atproto_pds");

    const types = Array.isArray(entry.type)
      ? entry.type
      : [entry.type];

    const hasCorrectType = types.includes(
      "AtprotoPersonalDataServer"
    );

    return hasCorrectId && hasCorrectType;
  });

  if (!service || typeof service.serviceEndpoint !== "string") {
    throw new AtprotoDiscoveryError(
      "Aucun PDS AT Protocol valide n'est déclaré pour ce compte."
    );
  }

  return normalizeAndValidatePdsUrl(service.serviceEndpoint);
}

/**
 * Vérifie et normalise l'URL du PDS.
 */
function normalizeAndValidatePdsUrl(endpoint: string): string {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new AtprotoDiscoveryError(
      "Le document DID contient une adresse de PDS invalide."
    );
  }

  if (url.protocol !== "https:") {
    throw new AtprotoDiscoveryError(
      "Le PDS du compte n'utilise pas une connexion HTTPS sécurisée."
    );
  }

  if (url.username || url.password) {
    throw new AtprotoDiscoveryError(
      "L'adresse du PDS contient des informations interdites."
    );
  }

  // Un serviceEndpoint AT Protocol doit désigner l'origine du serveur,
  // sans chemin, paramètres ou fragment.
  return url.origin;
}

/**
 * Découvre toutes les informations nécessaires à la connexion.
 */
export async function discoverAccount(
  identifier: string
): Promise<DiscoveredAccount> {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const did = await resolveHandleToDid(normalizedIdentifier);
  const didDocument = await resolveDidDocument(did);
  const pdsUrl = extractPdsUrl(didDocument);

  return {
    identifier: normalizedIdentifier,
    did,
    pdsUrl,
  };
}

function isSupportedDid(value: string): boolean {
  return value.startsWith("did:plc:") || value.startsWith("did:web:");
}
