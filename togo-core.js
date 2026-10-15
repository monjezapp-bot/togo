/* ToGo shared UI core. No secrets, no backend rules; the server decides. */
(function(){
const C=window.TOGO_CONFIG||{};
const mode=()=>C.demo?'demo':(C.runtime==='configured'?'live':'unconfigured');
const toMinor=v=>{if(v===null||v===undefined||v==='')return null;try{return BigInt(String(v))}catch(e){return null}};
function egp(v){const m=toMinor(v);if(m===null)return 'غير معروف';const n=m<0n,a=n?-m:m,r=(a%100n).toString().padStart(2,'0');
 return (n?'-':'')+(a/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,',')+(r==='00'?'':'.'+r)+' ج.م'}
const keys=new Map();
const requestKey=i=>{if(!keys.has(i))keys.set(i,crypto.randomUUID());return keys.get(i)};
const clearKey=i=>keys.delete(i);
const fail=(m,code)=>Object.assign(new Error(m),{code});
/* U1 rider adapter: rider contract paths go straight to the database RPCs through the
   signed-in Neon client (window.__togoDb). No server. The engine still decides everything. */
async function riderRpc(path,body){
 const d=window.__togoDb;
 if(!d){if(window.__togoAuthFail)window.__togoAuthFail();throw fail('انتهت الجلسة. سجّل الدخول من جديد.',401)}
 const once=(fn,arg)=>d.rpc(fn,arg);
 const rpcCall=async(fn,arg)=>{const waits=[1500,2500,4000,5000];let r=await once(fn,arg);let t=0;
  while(r.error&&/Trusted current session required/i.test(String(r.error.message||''))&&t<waits.length){await new Promise(z=>setTimeout(z,waits[t]));r=await once(fn,arg);t++}
  return r};
 const wrap=p=>p.then(r=>{if(r.error){const e=r.error;const msg=String(e.message||'');
   const code=e.code==='PT401'?401:e.code==='PT403'?403:e.code==='PT409'?409:e.code==='PT404'?404:(/jwt|expired|unauthor/i.test(msg)?401:e.code||'SRV');
   if(code===401&&window.__togoAuthFail)window.__togoAuthFail();
   const friendly=/Partial delivery\/collection|Exact remaining collection/.test(msg)?'المبلغ المستلم لا يطابق المطلوب. راجع المبلغ؛ لم يُسجّل التسليم ولم تتحرك المحفظة.':/Closed, stale|already finalized/.test(msg)?'حالة الأوردر تغيرت. حدّث الأوردرات قبل المحاولة؛ لم يُسجّل تسليم جديد.':/Damaged order|damaged or invalid/.test(msg)?'هذا الأوردر يحتاج مراجعة من الإدارة قبل تسجيل التسليم.':/No such active assignment/.test(msg)?'الأوردر لم يعد متاحًا للتسليم. حدّث الأوردرات وراجع حالته.':msg;
   throw fail(e.messageArabic||friendly,code)}return r.data});
 if(path==='/rider/wallet')return{rows:await wrap(rpcCall('rider_wallet',{}))};
 if(path==='/rider/wallet/history')return{rows:await wrap(rpcCall('rider_wallet_history',{p_limit:1000,p_offset:0}))};
 if(path==='/rider/movements')return{rows:await wrap(rpcCall('rider_movements',{p_limit:1000,p_offset:0}))};
 if(path==='/rider/assignments')return{rows:await wrap(rpcCall('rider_assignments',{}))};
 if(path==='/rider/reports'&&!body)return{rows:await wrap(rpcCall('rider_report_status',{p_limit:100,p_offset:0}))};
 if(path==='/rider/reports'&&body){
  if(body.kind==='collection')throw fail('التحصيل يُسجَّل ضمن إبلاغ التسليم في النظام الجديد. الإبلاغ المنفصل عن التحصيل غير متاح.','UNSUPPORTED');
  const args={source_event_id:body.source_event_id,assignment_id:body.assignment_id,kind:body.kind,
    collected_minor:body.collected_minor==null?null:body.collected_minor,device_at:body.device_at||new Date().toISOString(),
    note:body.evidence_ref||null,problem_note:body.problem_note||null};
  return{result:await wrap(rpcCall('submit_rider_report',args))}}
 throw fail('مسار غير معروف',404)}
async function api(path,body){
 if(mode()==='demo')throw fail('وضع العرض: لا اتصال بالخادم','DEMO');
 if(mode()==='unconfigured')throw fail('غير متصل: الربط غير مهيأ','UNCONFIGURED');
 if(path.startsWith('/rider/'))return riderRpc(path,body);
 let res;try{res=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})}
 catch(e){throw fail('تعذر الاتصال بالخادم. لم يتأكد أي شيء.','OFFLINE')}
 let j=null;try{j=await res.json()}catch(e){}
 if(!res.ok)throw fail((j&&j.error)||'خطأ من الخادم',res.status);
 return j}
const TXT={401:'انتهت الجلسة. سجّل الدخول من جديد.',403:'غير مسموح لهذا الحساب.',409:'تعارض أو عملية غير مؤكدة. حدّث الحالة وراجع من جديد.',404:'الخدمة غير متاحة مؤقتًا. أغلق التطبيق وافتحه ليتحدّث.',413:'الحجم أكبر من الحد.',415:'نوع غير مدعوم.',503:'الخدمة غير مهيأة أو متوقفة.',OFFLINE:'تعذر الاتصال بالخادم. لم يتأكد أي شيء.',UNCONFIGURED:'غير متصل: الربط غير مهيأ.',DEMO:'وضع العرض: لا اتصال بالخادم.'};
const errText=e=>(e&&e.message&&e.code!==409?e.message:'')||TXT[e&&e.code]||'حدث خطأ غير معروف';
window.TogoCore={egp,toMinor,requestKey,clearKey,mode,api,errText};
})();
