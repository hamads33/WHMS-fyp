async function fetchClientInfo(name){
  const agify = await fetch(`https://api.agify.io?name=${encodeURIComponent(name)}`).then(r=>r.json());
  const genderize = await fetch(`https://api.genderize.io?name=${encodeURIComponent(name)}`).then(r=>r.json());
  return {agify,genderize};
}
async function runServerAction(name){
  try{
    const res = await fetch('/api/plugins/execute',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:"plugin:complex_ui_plugin:fetchProfile", pluginId:"complex_ui_plugin", payload:{name}})
    });
    return await res.json();
  }catch(e){
    return {error:e.message};
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  const btn=document.getElementById('btnFetch');
  const btnRun=document.getElementById('btnRunServer');
  const input=document.getElementById('name');
  const out=document.getElementById('output');
  btn.addEventListener('click',async()=>{
    const name=input.value.trim(); if(!name) return alert('Enter a name');
    out.innerHTML='<div class="small">Loading client-side fetch...</div>';
    try{
      const data=await fetchClientInfo(name);
      out.innerHTML=`<div class="result"><strong>Name:</strong> ${name}<div><strong>Age:</strong> ${data.agify.age} (count ${data.agify.count})</div><div><strong>Gender:</strong> ${data.genderize.gender} (prob ${data.genderize.probability})</div></div>`;
    }catch(e){
      out.innerHTML='<div class="small">Client fetch failed: '+e.message+'</div>';
    }
  });
  btnRun.addEventListener('click',async()=>{
    const name=input.value.trim(); if(!name) return alert('Enter a name');
    out.innerHTML='<div class="small">Calling server-side plugin action...</div>';
    const res=await runServerAction(name);
    out.innerHTML='<div class="result"><pre style="white-space:pre-wrap;">'+JSON.stringify(res,null,2)+'</pre></div>';
  });
});