/** Install only the fork's compiled resolver into a known v0.9.4 deployment.
 * Preserve all unrelated local compatibility patches; refuse unexpected code.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const target=process.argv[2];if(!target)throw Error('Usage: node scripts/install-image-history-fix.mjs PACKAGE_DIRECTORY [--install]');
if(JSON.parse(fs.readFileSync(path.join(target,'package.json'))).version!=='0.9.4')throw Error('Only the audited v0.9.4 runtime is supported');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const compiled=fs.readFileSync(new URL('../lib/translate/resolved.js',import.meta.url),'utf8');
function span(s){const start=s.indexOf('async function resolveImages(');if(start<0)throw Error('Resolver missing');const end=s.indexOf('\n}',start)+2;if(end<start)throw Error('Resolver end missing');return {start,end,text:s.slice(start,end)};}
const fixed=span(compiled).text;if(!fixed.includes('...message,'))throw Error('Build the fixed source first');
const changes=[];
for(const rel of ['lib/translate/resolved.js','lib/index.js']){
 const file=path.join(target,rel);const before=fs.readFileSync(file,'utf8');const old=span(before);
 if(old.text.includes('...message,'))throw Error('Already fixed; inspect revision before reinstalling');
 const normalized=old.text.replace(/\s+/g,'');
 if(!normalized.includes('role:message.role,source:message.source,content:'))throw Error('Unrecognized resolver envelope');
 // Only audited baseline functions are accepted, including the bundled spelling.
 const allowed = ['d6ec05d92718ded9c6742d488a158d9d075bd9def8d0cd1b90a0aa8af3917e30', '946033995b375a3c64515c7b2cab83b80147445a4bc8fcd453ef25e6cc9184d3'];
 if(!allowed.includes(sha(old.text)))throw Error('Resolver baseline hash mismatch');
 const replacement=old.text.replace(/role: message.role,\s*source: message.source,/, '...message,');
 if(replacement===old.text)throw Error('Envelope replacement failed');

 changes.push({file,rel,before,after:before.slice(0,old.start)+replacement+before.slice(old.end)});
}
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}).trim();
const backup=path.join(path.dirname(target),`image-history-backup-${Date.now()}`);
if(process.argv.includes('--install')){
 fs.mkdirSync(backup,{recursive:true,mode:0o700});
 for(const c of changes){const b=path.join(backup,c.rel);fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(c.file,b);fs.writeFileSync(c.file+'.tmp',c.after);fs.renameSync(c.file+'.tmp',c.file);}
 fs.writeFileSync(path.join(backup,'receipt.json'),JSON.stringify({revision,changes:changes.map(c=>({path:c.file,before:sha(c.before),after:sha(c.after)}))},null,2));
}
console.log(JSON.stringify({mode:process.argv.includes('--install')?'installed':'validated',revision,backup,files:changes.map(c=>c.rel)}));
