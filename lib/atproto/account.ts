import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

async function getAccountAgent() {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");
  const agent = await resumeAgentSession(session);
  return { agent, session };
}

export async function getSessionInfo() {
  const { agent } = await getAccountAgent();
  const res = await agent.api.com.atproto.server.getSession();
  return res.data;
}

export async function updateHandle(newHandle: string): Promise<void> {
  const { agent } = await getAccountAgent();
  await agent.api.com.atproto.identity.updateHandle({ handle: newHandle }, { encoding: "application/json" });
}

/**
 * Étape 1/2 pour changer d'email : envoie un code de vérification à
 * l'adresse actuelle si l'email est déjà confirmé (tokenRequired=true).
 */
export async function requestEmailUpdate(): Promise<boolean> {
  const { agent } = await getAccountAgent();
  const res = await agent.api.com.atproto.server.requestEmailUpdate();
  return res.data.tokenRequired;
}

/** Étape 2/2 : applique la nouvelle adresse (avec le code si requis). */
export async function updateEmail(email: string, token?: string): Promise<void> {
  const { agent } = await getAccountAgent();
  await agent.api.com.atproto.server.updateEmail({ email, token }, { encoding: "application/json" });
}

/** Étape 1/2 pour changer de mot de passe : envoie un code par email. */
export async function requestPasswordReset(email: string): Promise<void> {
  const { agent } = await getAccountAgent();
  await agent.api.com.atproto.server.requestPasswordReset({ email }, { encoding: "application/json" });
}

/** Étape 2/2 : applique le nouveau mot de passe avec le code reçu. */
export async function resetPassword(token: string, password: string): Promise<void> {
  const { agent } = await getAccountAgent();
  await agent.api.com.atproto.server.resetPassword({ token, password }, { encoding: "application/json" });
}

export async function listAppPasswords() {
  const { agent } = await getAccountAgent();
  const res = await agent.api.com.atproto.server.listAppPasswords();
  return res.data.passwords;
}

export async function createAppPassword(name: string) {
  const { agent } = await getAccountAgent();
  const res = await agent.api.com.atproto.server.createAppPassword({ name }, { encoding: "application/json" });
  return res.data;
}

export async function revokeAppPassword(name: string): Promise<void> {
  const { agent } = await getAccountAgent();
  await agent.api.com.atproto.server.revokeAppPassword({ name }, { encoding: "application/json" });
}

/** Étape 1/2 pour supprimer le compte : envoie un code de confirmation par email. */
export async function requestAccountDelete(): Promise<void> {
  const { agent } = await getAccountAgent();
  await agent.api.com.atproto.server.requestAccountDelete();
}

/** Étape 2/2 : supprime définitivement le compte. Action irréversible. */
export async function deleteAccount(token: string, password: string): Promise<void> {
  const { agent, session } = await getAccountAgent();
  await agent.api.com.atproto.server.deleteAccount(
    { did: session.did, password, token },
    { encoding: "application/json" }
  );
}

/**
 * Télécharge l'archive complète du dépôt AT Protocol (fichier .car — le
 * format standard du protocole) et déclenche le téléchargement navigateur.
 */
export async function downloadRepoArchive(): Promise<void> {
  const { agent, session } = await getAccountAgent();
  const res = await agent.api.com.atproto.sync.getRepo({ did: session.did });
  const blob = new Blob([res.data as BlobPart], { type: "application/vnd.ipld.car" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${session.handle}-archive.car`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
