import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// @ts-ignore Operations scripts are intentionally dependency-free JavaScript.
import {serviceEnvironmentPlan} from '../scripts/service-environment-plan.mjs';
const config=JSON.parse(readFileSync(new URL('../config/services.production.json',import.meta.url),'utf8'));
test('one service address supplies all consumers and preserves service ownership',()=>{const p=serviceEnvironmentPlan(config);assert.equal(p.length,5);for(const item of p.filter((x:any)=>['banking','app'].includes(x.service))){assert.equal(item.values.CORE_API_URL,config.services.core);assert.equal(item.values.PLATFORM_HUB_URL,config.services.hub);assert.equal(item.values.NEXT_PUBLIC_SIGN_IN_URL,config.services.hub+'/auth/sign-in');}assert.equal(p.find((x:any)=>x.service==='website').values.HUB_URL,config.services.hub);});
test('registry refuses credential-bearing URLs, insecure URLs, paths and unrelated domains',()=>{for(const hub of ['http://hub.citizenbank.co.ls','https://secret@hub.citizenbank.co.ls','https://hub.citizenbank.co.ls/path','https://untrusted.example'])assert.throws(()=>serviceEnvironmentPlan({...config,services:{...config.services,hub}}));});
