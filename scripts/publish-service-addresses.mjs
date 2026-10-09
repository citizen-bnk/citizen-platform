import {readFileSync} from 'node:fs';
import {serviceEnvironmentPlan} from './service-environment-plan.mjs';
const config=JSON.parse(readFileSync(new URL('../config/services.production.json',import.meta.url),'utf8'));
const plan=serviceEnvironmentPlan(config);
if(!process.argv.includes('--apply')){console.log(JSON.stringify(plan,null,2));process.exit(0);}
const token=process.env.VERCEL_TOKEN;if(!token)throw Error('Set VERCEL_TOKEN securely in the execution environment; do not put it in the registry.');
for(const item of plan){
 const url=new URL('https://api.vercel.com/v10/projects/'+item.projectId+'/env');url.searchParams.set('teamId',item.teamId);url.searchParams.set('upsert','true');
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(Object.entries(item.values).map(([key,value])=>({key,value,type:'plain',target:['production','preview'],comment:'Derived from citizen-platform/config/services.production.json'}))),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('Configuration update failed for '+item.service+' (HTTP '+r.status+'). No deployments started.');
 console.log('Updated '+item.service);
}
console.log('All service settings updated. Rebuild and publish the reviewed commits in all five Vercel projects.');
