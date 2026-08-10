/* DOM mínimo para poder ejecutar el HTML fuera del navegador y verificar
   que el cableado motor↔vista funciona sin abrir Chrome. */
export function installDOM(){
  const mk = (tag="div") => {
    const el = {
      tagName:tag, children:[], style:{}, dataset:{}, _cls:new Set(),
      _html:"", textContent:"", offsetLeft:0, offsetTop:0,
      offsetWidth:650, offsetHeight:680,
      classList:{ add:(...c)=>c.forEach(x=>el._cls.add(x)),
                  remove:(...c)=>c.forEach(x=>el._cls.delete(x)),
                  toggle:(c,v)=>{ v??!el._cls.has(c) ? el._cls.add(c) : el._cls.delete(c); },
                  contains:c=>el._cls.has(c) },
      appendChild:c=>{ el.children.push(c); c._parent=el; return c; },
      insertBefore:(c,ref)=>{ const i=ref?el.children.indexOf(ref):0;
        el.children.splice(i<0?0:i,0,c); c._parent=el; return c; },
      get firstChild(){ return el.children[0] ?? null; },
      remove(){ const p=el._parent; if(p){ const i=p.children.indexOf(el); if(i>=0) p.children.splice(i,1); } },
      addEventListener(){}, removeEventListener(){},
      querySelector:()=>mk(), querySelectorAll:()=>[], hidden:false, dataset:{},
      getBoundingClientRect:()=>({left:0,top:0,width:82,height:119}),
      get innerHTML(){ return el._html; },
      set innerHTML(v){ el._html=String(v); el.children.length=0; },  // como el navegador
      get className(){ return [...el._cls].join(" "); },
      set className(v){ el._cls=new Set(String(v).split(/\s+/).filter(Boolean)); },
      focus(){}, click(){}, clientWidth:1200, clientHeight:820,
      onmouseenter:null, onclick:null,
    };
    return el;
  };
  const byId = new Map();
  global.document = {
    createElement: mk,
    getElementById: id => { if(!byId.has(id)) byId.set(id, mk()); return byId.get(id); },
    querySelector: s => { const id=s.startsWith("#")?s.slice(1):s;
      if(!byId.has(id)) byId.set(id, mk()); return byId.get(id); },
    querySelectorAll: (sel) => {
      // suficiente para los tests: busca por id entre los ya creados
      const out=[];
      for(const [id,el] of byId) if(sel.includes(id)) out.push(el);
      return out;
    },
    addEventListener(){},
    body: mk("body"),
  };
  global.window = { innerWidth:1400, innerHeight:800, addEventListener(){},
                    requestAnimationFrame:f=>setTimeout(()=>f(performance.now()),0) };
  global.requestAnimationFrame = global.window.requestAnimationFrame;
  global.innerWidth = 1920; global.innerHeight = 1080;
  global.getComputedStyle = () => ({ getPropertyValue: () => "118px" });
  global.document.documentElement = mk();
  global.performance = global.performance ?? { now:()=>Date.now() };
  global.location = { reload(){} };
  global.localStorage={ getItem:()=>null, setItem(){} };
  return byId;
}
