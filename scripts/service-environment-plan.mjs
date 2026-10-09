import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function serviceEnvironmentPlan(config){
 if(config.version!==1)throw Error('Unsupported service registry version');
 const s=config.services;
 for(const key of ['website','hub','banking','app','core']){
  const u=new URL(s[key]);
  if(u.protocol!=='https:'||u.origin!==s[key]||u.username||u.password||u.port)throw Error('Service addresses must be HTTPS origins without paths or credentials');
  if(!(u.hostname.endsWith('.citizenbank.co.ls')||u.hostname==='citizenbank.co.ls'||u.hostname==='citizenbankcore-demo.vercel.app'))throw Error('New domains require ownership and authentication review');
  if(!/^prj_[A-Za-z0-9]+$/.test(config.projects[key]))throw Error('Invalid Vercel project');
 }
 const front={NEXT_PUBLIC_HUB_URL:s.hub,NEXT_PUBLIC_WEBSITE_URL:s.website,NEXT_PUBLIC_SIGN_IN_URL:s.hub+'/auth/sign-in',SIGN_IN_URL:s.hub+'/auth/sign-in',PLATFORM_HUB_URL:s.hub,PLATFORM_WEBSITE_URL:s.hub,CORE_API_URL:s.core};
 const env={website:{HUB_URL:s.hub,BANKING_URL:s.banking,APP_URL:s.app,VITE_HUB_URL:s.hub,VITE_BANKING_URL:s.banking,VITE_BANKING_APP_URL:s.app},hub:{NEXT_PUBLIC_WEBSITE_URL:s.website,NEXT_PUBLIC_BANKING_URL:s.banking,BANKING_URL:s.banking,APP_URL:s.app,ACCOUNT_RECOVERY_ORIGIN:s.hub,VITE_WEBSITE_URL:s.website},banking:front,app:front,core:{CITIZEN_HUB_URL:s.hub,PLATFORM_WEBSITE_URL:s.hub,PLATFORM_JWKS_URL:s.hub+'/api/platform/jwks.json'}};
 return Object.entries(env).map(([service,values])=>({service,projectId:config.projects[service],teamId:config.teamId,values}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const config=JSON.parse(readFileSync(new URL('../config/services.production.json',import.meta.url),'utf8'));
 console.log(JSON.stringify(serviceEnvironmentPlan(config),null,2));
}
