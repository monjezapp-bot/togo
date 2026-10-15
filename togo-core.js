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
async function api(path,body){
 if(mode()==='demo')throw fail('وضع العرض: لا اتصال بالخادم','DEMO');
 if(mode()==='unconfigured')throw fail('غير متصل: الربط غير مهيأ','UNCONFIGURED');
 let res;try{res=await fetch('/api'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})}
 catch(e){throw fail('تعذر الاتصال بالخادم. لم يتأكد أي شيء.','OFFLINE')}
 let j=null;try{j=await res.json()}catch(e){}
 if(!res.ok)throw fail((j&&j.error)||'خطأ من الخادم',res.status);
 return j}
const TXT={401:'انتهت الجلسة. سجّل الدخول من جديد.',403:'غير مسموح لهذا الحساب.',409:'تعارض أو عملية غير مؤكدة. حدّث الحالة وراجع من جديد.',413:'الحجم أكبر من الحد.',415:'نوع غير مدعوم.',503:'الخدمة غير مهيأة أو متوقفة.',OFFLINE:'تعذر الاتصال بالخادم. لم يتأكد أي شيء.',UNCONFIGURED:'غير متصل: الربط غير مهيأ.',DEMO:'وضع العرض: لا اتصال بالخادم.'};
const errText=e=>(e&&e.message&&e.code!==409?e.message:'')||TXT[e&&e.code]||'حدث خطأ غير معروف';
window.TogoCore={egp,toMinor,requestKey,clearKey,mode,api,errText};
})();
