import { NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";

const COLLECTION = "eu.kelosocial.identityverification";
const PDS_URL = process.env.KELO_ADMIN_PDS_URL?.trim() || "https://eurosky.social";
const REPO = process.env.NEXT_PUBLIC_KELO_ADMIN_DID?.trim() || process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() || "kelosocial.eu";
const TYPES = ["human","enterprise","media","university","association","institution","political-party","ai"] as const;
type VerificationType = typeof TYPES[number];

function norm(v:string){return v.trim().replace(/^@/,"").toLowerCase();}
function admins(){return (process.env.ADMIN_HANDLES||"").split(",").map(norm).filter(Boolean);}
function adminDids(){return (process.env.ADMIN_DIDS||"").split(",").map(norm).filter(Boolean);}

async function assertAdmin(session:any){
  if(!session?.accessJwt||!session?.pdsUrl||!session?.handle||!session?.did) throw new Error("Session invalide.");
  const agent=new AtpAgent({service:session.pdsUrl});
  await agent.resumeSession({accessJwt:session.accessJwt,refreshJwt:session.refreshJwt||"",active:true,handle:session.handle,did:session.did});
  const s=await agent.api.com.atproto.server.getSession();
  const did=norm(s.data.did||""), handle=norm(s.data.handle||"");
  let ok=adminDids().includes(did)||admins().includes(handle);
  const id=norm(process.env.KELO_ADMIN_ATPROTO_IDENTIFIER||"");
  const pw=process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim()||"";
  if(id&&pw){
    const a=new AtpAgent({service:PDS_URL}); await a.login({identifier:id,password:pw});
    const as=await a.api.com.atproto.server.getSession();
    ok=ok||did===norm(as.data.did||"")||handle===norm(as.data.handle||"");
  }
  if(!ok) throw new Error("Accès réservé à l’administrateur Kelo Social.");
  return {did,handle};
}
export async function GET() {
  try {
    const agent = new AtpAgent({ service: PDS_URL });
    const records: unknown[] = [];
    let cursor: string | undefined;
    do {
      const response = await agent.api.com.atproto.repo.listRecords({ repo: REPO, collection: COLLECTION, limit: 100, cursor });
      records.push(...response.data.records.map((item) => item.value));
      cursor = response.data.cursor;
    } while (cursor);
    return NextResponse.json({ records, meta: { count: records.length, repo: REPO, fetchedAt: new Date().toISOString() } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `Impossible de charger les vérifications d’identité : ${error.message}` : "Impossible de charger les vérifications d’identité.", records: [] }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request:Request){
 try{
  const body=await request.json();
  const session=body?.session, targetDid=norm(body?.targetDid||""), targetHandle=norm(body?.targetHandle||""), verificationType=body?.verificationType;
  if(!TYPES.includes(verificationType)) return NextResponse.json({error:"Type de vérification invalide."},{status:400});
  if(!targetDid||!targetHandle) return NextResponse.json({error:"Compte cible incomplet."},{status:400});
  const issuer=await assertAdmin(session);
  const identifier=process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim()||"";
  const password=process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim()||"";
  if(!identifier||!password) throw new Error("Configuration administrateur incomplète.");
  const agent=new AtpAgent({service:PDS_URL});
  await agent.login({identifier,password});
  const record={$type:COLLECTION,subjectDid:targetDid,subjectHandle:targetHandle,verificationType,source:"kelo-verify",assignmentMode:"manual",issuedAt:new Date().toISOString(),issuerDid:issuer.did,issuerHandle:issuer.handle,schemaVersion:1};
  const response=await agent.api.com.atproto.repo.putRecord({repo:REPO,collection:COLLECTION,rkey:targetDid,record,validate:false});
  return NextResponse.json({success:true,record,uri:response.data.uri,cid:response.data.cid});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Impossible d’attribuer la vérification."},{status:500});}
}

