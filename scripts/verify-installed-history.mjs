import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const target=process.argv[2];if(!target)throw Error('Usage: node scripts/verify-installed-history.mjs PACKAGE [PRIVATE_CAPTURE]');
const {resolveImages}=await import(pathToFileURL(`${target}/lib/translate/resolved.js`).href);
const {toAnthropicMessages}=await import(pathToFileURL(`${target}/lib/translate/anthropic.js`).href);
const ref={attachmentId:'fixture',mediaType:'image/png',bytes:1};
const image={type:'image',attachment:ref};const attachments={readImage:async()=>({ref,data:new Uint8Array([0])})};
for(const imagePlace of ['none','user','tool']){
 const history=[{role:'user',id:'u',content:imagePlace==='user'?[image]:[{type:'text',text:'synthetic fixture'}]},
 {role:'assistant',id:'a',content:['a','b'].map(id=>({type:'tool-call',id,name:'read',arguments:'{}'}))},
 ...['a','b'].map((id,i)=>({role:'tool',id:'r'+id,toolCallId:id,isError:!!i,content:imagePlace==='tool'&&i?[image]:[{type:'text',text:'synthetic result'}]}))];
 const original=structuredClone(history);const resolved=await resolveImages(history,attachments);const blocks=toAnthropicMessages(resolved).flatMap(m=>m.content);
 assert.deepEqual(history,original);assert.equal(blocks.filter(b=>b.type==='tool_use').length,2);assert.equal(blocks.filter(b=>b.type==='tool_result').length,2);assert.equal(blocks.find(b=>b.type==='tool_result'&&b.tool_use_id==='b').is_error,true);assert.equal(blocks.some(b=>b.type==='text'&&b.text.includes('[Historical tool call')),false);
}
if(process.argv[3]){
 const x=JSON.parse(fs.readFileSync(process.argv[3]));const fixed=x.resolved.map((m,i)=>({...x.adapterInput[i],content:m.content}));
 const blocks=toAnthropicMessages(fixed).flatMap(m=>m.content);const expected=x.adapterInput.flatMap(m=>m.content).filter(b=>b.type==='tool-call').length;
 assert.equal(blocks.filter(b=>b.type==='tool_use').length,expected);assert.equal(blocks.filter(b=>b.type==='tool_result').length,expected);console.log(`Private captured-history check: ${expected} pairs preserved`);
}
console.log('PASS: no image, user image, tool-result image, parallel calls, error flags, immutable history; no invented historical markers');
