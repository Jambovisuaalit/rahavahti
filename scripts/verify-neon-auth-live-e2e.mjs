/**
 * Live Neon Auth + two-session tenant isolation acceptance harness.
 * Opt-in ONLY. Secrets and test identities are supplied via CI secret variables.
 * No automatic account creation, no financial writes, no production traffic.
 */
import { request } from '@playwright/test';

const needed=[
 'RAHAVAHTI_QA_BASE_URL','RAHAVAHTI_QA_DEPLOYMENT_ID','VERCEL_TOKEN','GITHUB_SHA',
 'RAHAVAHTI_QA_USER_A_EMAIL','RAHAVAHTI_QA_USER_A_PASSWORD',
 'RAHAVAHTI_QA_USER_B_EMAIL','RAHAVAHTI_QA_USER_B_PASSWORD',
 'RAHAVAHTI_QA_USER_A_ACCOUNT_ID','RAHAVAHTI_QA_USER_B_ACCOUNT_ID',
];
const missing=needed.filter(name=>!process.env[name]);
if(missing.length)throw Error('QA credentials / fixtures not configured: '+missing.join(', '));
const base=process.env.RAHAVAHTI_QA_BASE_URL.replace(/\/+$/,'');
if(!base.startsWith('https://'))throw Error('QA endpoint must use HTTPS');
if(/localhost|127\.0\.0\.1|\.invalid/.test(base))throw Error('QA endpoint must be a real, isolated preview');
// Fail closed before sending any credentials. Vercel identifies Preview with
// target=null: a deployment reported as production/staging is never acceptable.
const deploymentId=process.env.RAHAVAHTI_QA_DEPLOYMENT_ID;
if(!/^dpl_[A-Za-z0-9]+$/.test(deploymentId))throw Error('Invalid Vercel deployment ID');
const projectId='prj_V62Qmsp2qKO8feF2ZIXQFDUmEJDL';
const teamId='team_zwsvoePoiBeskRuyl2Iar883';
const metadataResponse=await fetch('https://api.vercel.com/v13/deployments/'+encodeURIComponent(deploymentId)+'?teamId='+encodeURIComponent(teamId),{
 headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN,Accept:'application/json'},
 signal:AbortSignal.timeout(15000)
});
if(!metadataResponse.ok)throw Error('Vercel preview metadata unavailable: HTTP '+metadataResponse.status);
const deployment=await metadataResponse.json();
const target=deployment.target??null;
const actualProjectId=deployment.projectId??deployment.project?.id;
const actualSha=deployment.meta?.githubCommitSha??deployment.gitSource?.sha;
if(target!==null)throw Error('HOLD: Vercel deployment is not Preview');
if(deployment.readyState!=='READY')throw Error('HOLD: Vercel preview is not READY');
if(actualProjectId!==projectId)throw Error('HOLD: deployment belongs to another Vercel project');
if(actualSha!==process.env.GITHUB_SHA)throw Error('HOLD: deployment commit does not match reviewed workflow commit');
if(new URL(base).hostname!==deployment.url)throw Error('HOLD: QA URL is not the verified commit deployment');
console.log('PASS: Vercel Preview target, QA project, READY state and exact commit verified');

const QA_A={
  email:process.env.RAHAVAHTI_QA_USER_A_EMAIL,
  password:process.env.RAHAVAHTI_QA_USER_A_PASSWORD,
  accountId:process.env.RAHAVAHTI_QA_USER_A_ACCOUNT_ID,
};
const QA_B={
  email:process.env.RAHAVAHTI_QA_USER_B_EMAIL,
  password:process.env.RAHAVAHTI_QA_USER_B_PASSWORD,
  accountId:process.env.RAHAVAHTI_QA_USER_B_ACCOUNT_ID,
};
if(QA_A.email===QA_B.email||QA_A.accountId===QA_B.accountId)
 throw Error('QA identities and account IDs must be distinct');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for(const x of [QA_A,QA_B])if(!uuid.test(x.accountId))throw Error('Invalid synthetic QA fixture account ID');

function check(condition,description){
 if(!condition)throw Error('E2E FAIL: '+description);
 console.log('PASS: '+description);
}
const anonymous=await request.newContext({baseURL:base,ignoreHTTPSErrors:false,extraHTTPHeaders:{'cache-control':'no-store'}});
const unauth=await anonymous.get('/api/accounts',{maxRedirects:0});
check(unauth.status()===401||unauth.status()===307||unauth.status()===302,'anonymous session cannot read accounts');
const contexts=[];
try{
 const seenIds=new Set();
 for(const [label,identity,other] of [['A',QA_A,QA_B],['B',QA_B,QA_A]]){
  const ctx=await request.newContext({baseURL:base,ignoreHTTPSErrors:false,extraHTTPHeaders:{'cache-control':'no-store'}});
  contexts.push(ctx);
  const signin=await ctx.post('/api/auth/sign-in/email',{data:{email:identity.email,password:identity.password},headers:{'origin':base}});
  check(signin.ok(),label+' Neon Auth sign-in accepted');
  const cookies=await ctx.storageState();
  check(cookies.cookies.some(c=>c.name.includes('session')),'session cookie issued for '+label);
  const me=await ctx.get('/api/auth/get-session',{headers:{'origin':base}});
  check(me.ok(),label+' session endpoint returned success');
  const payload=await me.json();
  const userId=payload?.user?.id??payload?.data?.user?.id;
  check(typeof userId==='string'&&userId.length>0,label+' real user identity verified');
  check(!seenIds.has(userId),'user identity distinct for '+label);
  seenIds.add(userId);
  const accountsResponse=await ctx.get('/api/accounts');
  check(accountsResponse.status()===200,label+' authenticated account query allowed');
  const accountData=await accountsResponse.json();
  const ids=(accountData?.accounts??[]).map(x=>x.id);
  check(ids.includes(identity.accountId),label+' own synthetic account visible');
  check(!ids.includes(other.accountId),label+' other synthetic account absent');
  const own=await ctx.get('/api/transactions?accountId='+identity.accountId);
  check(own.status()===200,label+' own transactions accessible');
  const cross=await ctx.get('/api/transactions?accountId='+other.accountId,{
   headers:{'x-user-id':other.email,'x-tenant-id':other.accountId},
  });
  check(cross.status()===404,label+' cross-tenant access blocked despite forged headers');
  const write=await ctx.post('/api/accounts',{data:{name:'SYNTHETIC_WRITE_SHOULD_NOT_SUCCEED'}});
  check(write.status()===423,label+' finance writes still HOLD');
  const csp=accountsResponse.headers()['content-security-policy'];
  check(typeof csp==='string'&&/script-src.+nonce-/.test(csp),label+' nonce CSP on authenticated response');
 }
 console.log('NEON_AUTH_TWO_LIVE_SESSIONS_PASS');
}finally{
 for(const ctx of contexts)await ctx.dispose();
 await anonymous.dispose();
}
