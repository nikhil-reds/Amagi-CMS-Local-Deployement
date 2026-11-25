import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Runs against the existing local Docker stack; only generated fixtures are removed.
const base = process.env.API_BASE_URL || 'http://localhost:3000';
const tag = `api-audit-${Date.now()}`;
const password = crypto.randomBytes(18).toString('hex');
const results = [], sessions = [], documents = [], screens = [], users = [];
const sql = query => execFileSync('docker', ['compose','exec','-T','db','psql','-U','postgres','-d','multimedia','-v','ON_ERROR_STOP=1','-c',query], {encoding:'utf8'});
const q = value => `'${value.replaceAll("'", "''")}'`;
async function check(label, method, path, expected, body, cookie, predicate) {
  const headers = cookie ? {cookie} : {};
  if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  try {
    const response = await fetch(base + path, {method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body), signal:AbortSignal.timeout(20000), redirect:'manual'});
    const raw = await response.text();
    let data; try {data=JSON.parse(raw)} catch {data=raw}
    const pass = (Array.isArray(expected)?expected:[expected]).includes(response.status) && (!predicate || predicate(data,response));
    results.push({label,method,path,expected,status:response.status,pass,...(!pass?{response:typeof data === 'string'?data.slice(0,150):data}:{})});
    return {data,response,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  } catch(error) { results.push({label,method,path,expected,status:null,pass:false,error:error.message}); return {data:{}} }
}
let admin, editor, viewer;
try {
  const salt=crypto.randomBytes(16), hash=crypto.scryptSync(password,salt,64);
  const id=tag+'-admin'; users.push(id);
  sql(`INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES (${q(id)},${q(tag)},${q(tag+'@example.invalid')},${q(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)},'ADMIN',NOW());`);
  admin=(await check('Admin login','POST','/api/auth/login',200,{email:tag+'@example.invalid',password})).cookie;
  if(!admin) throw new Error('Test administrator login failed');
  const routes=[];
  function walk(dir) {for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {const p=dir+'/'+entry.name;if(entry.isDirectory())walk(p);else if(entry.name==='route.ts'){const methods=[...fs.readFileSync(p,'utf8').matchAll(/export async function (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/g)].map(m=>m[1]);routes.push({path:p.replace('app','').replace('/route.ts','').replace(/\[[^\]]+\]/g,tag+'-missing'),methods});}}}
  walk('app/api');
  for(const route of routes) for(const method of ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']) {
    if(route.methods.includes(method))continue;
    await check('HTTP method dispatch',method,route.path,method==='OPTIONS'?204:method==='HEAD'&&route.methods.includes('GET')?route.path.includes(tag+'-missing')?404:200:405,undefined,admin);
  }
  await check('Anonymous me','GET','/api/auth/me',401);
  await check('Forged cookie rejected','GET','/api/auth/me',401,undefined,'tr-cms-session=api-audit-forged');
  await check('Forged admin rejected','GET','/api/users',401,undefined,'tr-cms-session=api-audit-forged');
  await check('Authenticated me','GET','/api/auth/me',200,undefined,admin,d=>d.user.id===id);
  await check('Missing login fields','POST','/api/auth/login',400,{});
  await check('Invalid login email','POST','/api/auth/login',400,{email:'bad',password});
  await check('Incorrect password','POST','/api/auth/login',401,{email:tag+'@example.invalid',password:'wrong-password'});
  await check('Register required fields','POST','/api/auth/register',400,{});
  await check('Anonymous registration blocked','POST','/api/auth/register',403,{name:tag,email:tag+'-anon@example.invalid',password});
  const registered=await check('Admin registers editor','POST','/api/auth/register',201,{name:tag,email:tag+'-registered@example.invalid',password},admin);
  if(registered.data.user)users.push(registered.data.user.id);
  await check('Duplicate registration','POST','/api/auth/register',409,{name:tag,email:tag+'-registered@example.invalid',password},admin);
  await check('Users list','GET','/api/users',200,undefined,admin,d=>Array.isArray(d.users)&&d.users.every(u=>!u.passwordHash));
  await check('Invalid user role','POST','/api/users',400,{name:tag,email:tag+'-bad@example.invalid',password,role:'INVALID'},admin);
  for(const role of ['EDITOR','VIEWER']) {
    const email=tag+'-'+role.toLowerCase()+'@example.invalid';
    const r=await check('Create '+role,'POST','/api/users',201,{name:tag,email,password,role},admin);
    if(r.data.user)users.push(r.data.user.id);
    const cookie=(await check('Login '+role,'POST','/api/auth/login',200,{email,password})).cookie;
    if(role==='EDITOR')editor=cookie; else viewer=cookie;
  }
  for(const cookie of [undefined,viewer,editor])await check('Users role restriction','GET','/api/users',cookie?403:401,undefined,cookie);
  for(const path of ['/api/documents','/api/sessions']) {
    await check('Anonymous read restricted','GET',path,401);
    await check('List data','GET',path,200,undefined,admin,Array.isArray);
  }
  for(const path of ['/api/documents/'+tag,'/api/sessions/'+tag,'/api/screens/'+tag,'/api/screens/'+tag+'/assets','/api/screens/'+tag+'/realtime'])await check('Missing resource','GET',path,404,undefined,admin);
  for(const path of ['/api/documents','/api/screens','/api/upload']) {
    await check('Anonymous write blocked','POST',path,401,{},undefined);
    await check('Viewer write blocked','POST',path,403,{},viewer);
  }
  await check('Missing website URL','POST','/api/documents',400,{},admin);
  await check('Unsafe URL scheme','POST','/api/documents',400,{url:'javascript:alert(1)'},admin);
  await check('Wrong URL type','POST','/api/documents',400,{url:42},admin);
  for(let i=0;i<4;i++) {
    const r=await check('Create website document','POST','/api/documents',201,{url:'https://example.invalid/audit-'+i,name:tag},editor);
    if(r.data.id){documents.push(r.data.id);sessions.push(r.data.sessionId)}
  }
  const doc=documents[0];
  await check('Document detail','GET','/api/documents/'+doc,200,undefined,admin,d=>d.id===doc);
  await check('Session detail','GET','/api/sessions/'+sessions[0],200,undefined,admin,d=>d.documents.some(x=>x.id===doc));
  const screen=(await check('Create screen','POST','/api/screens',201,{name:tag},editor)).data;
  if(screen.id)screens.push(screen.id);
  await check('Public screens','GET','/api/screens',200,undefined,undefined,Array.isArray);
  await check('Screen by id','GET','/api/screens/'+screen.id,200);
  await check('Screen by code','GET','/api/screens/'+screen.code,200);
  await check('Rename screen','PATCH','/api/screens/'+screen.id,200,{name:tag+'-renamed'},editor,d=>d.name===tag+'-renamed');
  await check('Empty screen name rejected','PATCH','/api/screens/'+screen.id,400,{name:''},editor);
  await check('Missing screen update','PATCH','/api/screens/'+tag,404,{name:tag},admin);
  await check('Asset requires document','POST',`/api/screens/${screen.id}/assets`,400,{},admin);
  await check('Missing asset document','POST',`/api/screens/${screen.id}/assets`,404,{documentId:tag},admin);
  const assets=[];
  for(let i=0;i<4;i++) {const r=await check('Asset capacity '+(i+1),'POST',`/api/screens/${screen.code}/assets`,i<3?201:400,{documentId:documents[i]},editor);if(r.data.id)assets.push(r.data.id)}
  await check('Duplicate asset idempotent','POST',`/api/screens/${screen.id}/assets`,200,{documentId:doc},editor);
  await check('Public assigned assets','GET',`/api/screens/${screen.id}/assets`,200,undefined,undefined,d=>d.length===3);
  await check('Realtime token','GET',`/api/screens/${screen.code}/realtime`,200,undefined,undefined,d=>!!d.token&&d.channel==='screen-'+screen.id);
  await check('Remove asset','DELETE',`/api/screens/${screen.id}/assets/${assets[0]}`,200,undefined,editor);
  await check('Empty bulk deletion rejected','DELETE','/api/documents',400,{ids:[]},admin);
  await check('Missing document deletion','DELETE','/api/documents/'+tag,404,undefined,admin);
  await check('Viewer single document deletion blocked','DELETE','/api/documents/'+documents[3],403,undefined,viewer);
  await check('Delete document','DELETE','/api/documents/'+documents[1],200,undefined,admin);
  await check('Bulk delete documents','DELETE','/api/documents',200,{ids:documents.slice(0,3)},editor);
  await check('Upload invalid multipart','POST','/api/upload',400,{},admin);
  await check('Upload empty multipart','POST','/api/upload',400,new FormData(),admin);
  const form=new FormData();form.append('files',new Blob(['API audit fixture\n'],{type:'text/plain'}),tag+'.txt');
  const upload=(await check('Upload file','POST','/api/upload',201,form,admin,d=>d.status==='COMPLETED'&&d.documents.length===1)).data;
  if(upload.id){sessions.push(upload.id);for(const d of upload.documents||[]){documents.push(d.id);const r=await check('Uploaded document URL','GET','/api/documents/'+d.id,200,undefined,admin);if(r.data.s3Url){try{const content=await fetch(r.data.s3Url,{signal:AbortSignal.timeout(10000)});results.push({label:'Download uploaded file',method:'GET',path:'storage fixture URL',expected:200,status:content.status,pass:content.ok&&(await content.text())==='API audit fixture\n'})}catch(e){results.push({label:'Download uploaded file',pass:false,error:e.message})}}}}
  await check('Cloudinary deprecated','POST','/api/cloudinary/sign',410,{},admin);
  const uid=users[users.length-1];
  await check('User update','PATCH','/api/users/'+uid,200,{name:tag+' updated',password:password+'2',role:'EDITOR'},admin);
  await check('Empty user update','PATCH','/api/users/'+uid,400,{},admin);
  await check('Missing user update','PATCH','/api/users/'+tag,404,{name:tag},admin);
  await check('Self deletion blocked','DELETE','/api/users/'+id,400,undefined,admin);
  await check('Delete test user','DELETE','/api/users/'+uid,200,undefined,admin);
  await check('Missing user deletion','DELETE','/api/users/'+tag,404,undefined,admin);
  await check('Delete test screen','DELETE','/api/screens/'+screen.id,200,undefined,editor);
  await check('Missing screen deletion','DELETE','/api/screens/'+tag,404,undefined,admin);
  await check('Logout','POST','/api/auth/logout',200,undefined,admin);
  await check('Revoked session rejected','GET','/api/auth/me',401,undefined,admin);
} catch(error) {results.push({label:'Audit execution',pass:false,error:error.message});}
finally {
  try {
    const {S3Client,ListObjectsV2Command,DeleteObjectCommand}=await import('@aws-sdk/client-s3');
    const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^["']|["']$/g,'')]}));
    const storage=new S3Client({endpoint:env.MINIO_ENDPOINT,region:env.MINIO_REGION||'us-east-1',forcePathStyle:true,credentials:{accessKeyId:env.MINIO_ACCESS_KEY,secretAccessKey:env.MINIO_SECRET_KEY}});
    const objects=await storage.send(new ListObjectsV2Command({Bucket:env.MINIO_BUCKET,Prefix:'documents/'}));
    for(const object of objects.Contents||[])if(/\/api-audit-\d+\.txt$/.test(object.Key))await storage.send(new DeleteObjectCommand({Bucket:env.MINIO_BUCKET,Key:object.Key}));
  }catch(e){results.push({label:'Cleanup storage fixtures',pass:false,error:e.message})}
  for(const [table,ids] of [['Screen',screens],['Session',sessions],['User',users]])if(ids.length)try{sql(`DELETE FROM "${table}" WHERE id IN (${ids.map(q).join(',')});`)}catch(e){results.push({label:'Cleanup '+table,pass:false,error:e.message})}
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync('test-results/api-audit.json',JSON.stringify({base,tag,at:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results},null,2));
  console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.pass).length,failures:results.filter(r=>!r.pass)},null,2));
}
