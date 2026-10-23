/* Physics EZ: nội dung do giáo viên thêm, không cần chạy lại mã.
   - Lưu tạm trên máy này (IndexedDB), hiện ngay.
   - Muốn mọi người cùng thấy: tải "gói cập nhật" ở trang Tải lên rồi kéo các file đó vào kho GitHub. */
(function(){
  var DB='physics-ez', ST='kv';
  function idb(){return new Promise(function(res,rej){
    if(!window.indexedDB){rej(new Error('no-idb'));return}
    var r;try{r=indexedDB.open(DB,1)}catch(e){rej(e);return}
    r.onupgradeneeded=function(){r.result.createObjectStore(ST)};
    r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)};r.onblocked=function(){rej(new Error('blocked'))}})}
  function op(mode,fn){return idb().then(function(db){return new Promise(function(res,rej){
    var t=db.transaction(ST,mode),s=t.objectStore(ST),q=fn(s);
    t.oncomplete=function(){res(q&&'result' in q?q.result:undefined)};t.onerror=function(){rej(t.error)};t.onabort=function(){rej(t.error)}})})}
  function getItems(){return op('readonly',function(s){return s.get('items')}).then(function(v){return v||[]},function(){return []})}
  function putItems(a){return op('readwrite',function(s){return s.put(a,'items')})}
  function uid(p){return p+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
  function slug(t){return String(t||'bai').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'bai'}

  var EZ=window.EZ={};
  EZ.supported=function(){return idb().then(function(d){d.close();return true},function(){return false})};
  EZ.local=getItems;
  EZ.addSim=function(m,html,cover){
    var id=uid('s'), base='bai-them-'+slug(m.title)+'-'+id.slice(-4);
    var it={id:id,type:'sim',title:m.title,grade:m.grade,desc:m.desc||'',file:base+'.html',cover:cover?base+'.'+(cover.ext||'jpg'):''};
    return getItems().then(function(a){a.push(it);return putItems(a)}).then(function(){
      return op('readwrite',function(s){s.put(html,'f:'+it.file);if(cover)s.put(cover.blob,'f:'+it.cover);return s.get('items')})}).then(function(){return it});
  };
  EZ.addPrompt=function(m){
    var it={id:uid('p'),type:'prompt',group:m.group,title:m.title,text:m.text};
    return getItems().then(function(a){a.push(it);return putItems(a)}).then(function(){return it});
  };
  EZ.remove=function(id){
    return getItems().then(function(a){var it=a.filter(function(x){return x.id===id})[0];
      return putItems(a.filter(function(x){return x.id!==id})).then(function(){
        if(!it)return;return op('readwrite',function(s){if(it.file)s.delete('f:'+it.file);if(it.cover)s.delete('f:'+it.cover);return s.get('items')})})})};
  EZ.file=function(name){return op('readonly',function(s){return s.get('f:'+name)})};
  EZ.remote=function(){
    return fetch('noi-dung.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){
      return (Array.isArray(j.items)?j.items:[]).filter(function(x){return x&&x.id&&x.type})},function(){return []})};
  /* all(): bản đã đăng (noi-dung.json) + bản trên máy này chưa đăng */
  EZ.all=function(){
    return Promise.all([EZ.remote(),getItems()]).then(function(r){
      var pub=r[0].map(function(x){x.pub=true;return x}), seen={};pub.forEach(function(x){seen[x.id]=1});
      var loc=r[1].filter(function(x){return !seen[x.id]}).map(function(x){x.pub=false;return x});
      return pub.concat(loc)})};
  EZ.manifest=function(items){return JSON.stringify({items:items.map(function(x){var c={};for(var k in x)if(k!=='pub')c[k]=x[k];return c})},null,2)};
  EZ.saveFile=async function(blob,name){
    try{var c=window.claude;if(c&&c.use){var d=await c.use('downloads');if(d){await d.save({filename:name,data:blob});return 'saved'}}}catch(e){if(e&&e.code==='declined')return 'declined'}
    var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);return 'link'};
  EZ.esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  EZ.coverUrl=function(it){
    if(!it.cover)return Promise.resolve('');
    if(it.pub)return Promise.resolve(it.cover);
    return EZ.file(it.cover).then(function(b){return b?URL.createObjectURL(b):''},function(){return ''})};
  EZ.viewHref=function(it){return 'xem.html?'+(it.pub?'f='+encodeURIComponent(it.file):'id='+encodeURIComponent(it.id))};
})();
