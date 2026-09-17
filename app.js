(() => {
  'use strict';
  const D = window.REDES_DATA;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const YEARS = Array.from({length:10},(_,i)=>String(2017+i));
  const REDES = D.redesOrder;
  const GEO_URLS = {
    dept:[
      'data/geo/departamento_simplificado.geojson',
      'https://cdn.jsdelivr.net/gh/Rodasluis/Peru-maps@v1.0.0/salida/departamento_simplificado.geojson',
      'https://raw.githubusercontent.com/Rodasluis/Peru-maps/v1.0.0/salida/departamento_simplificado.geojson',
      'https://rodasluis.github.io/Peru-maps/salida/departamento_simplificado.geojson'
    ],
    prov:[
      'data/geo/provincia_simplificado.geojson',
      'https://cdn.jsdelivr.net/gh/Rodasluis/Peru-maps@v1.0.0/salida/provincia_simplificado.geojson',
      'https://raw.githubusercontent.com/Rodasluis/Peru-maps/v1.0.0/salida/provincia_simplificado.geojson',
      'https://rodasluis.github.io/Peru-maps/salida/provincia_simplificado.geojson'
    ],
    dist:[
      'data/geo/distrito_simplificado.geojson',
      'https://cdn.jsdelivr.net/gh/Rodasluis/Peru-maps@v1.0.0/salida/distrito_simplificado.geojson',
      'https://raw.githubusercontent.com/Rodasluis/Peru-maps/v1.0.0/salida/distrito_simplificado.geojson',
      'https://rodasluis.github.io/Peru-maps/salida/distrito_simplificado.geojson'
    ]
  };
  const MAP_IMG = {
    '00':'assets/maps/Peru.svg',
    '01':'assets/maps/regions/Amazonas.png','02':'assets/maps/regions/Ancash.png','03':'assets/maps/regions/Apurimac.png','04':'assets/maps/regions/Arequipa.png',
    '05':'assets/maps/regions/Ayacucho.png','06':'assets/maps/regions/Cajamarca.png','07':'assets/maps/regions/Callao.png','08':'assets/maps/regions/Cusco.png',
    '09':'assets/maps/regions/Huancavelica.png','10':'assets/maps/regions/Huanuco.png','11':'assets/maps/regions/Ica.png','12':'assets/maps/regions/Junin.png',
    '13':'assets/maps/regions/La_Libertad.png','14':'assets/maps/regions/Lambayeque.png','15':'assets/maps/regions/Lima_Provincias.png','16':'assets/maps/regions/Loreto.png',
    '17':'assets/maps/regions/Madre_de_Dios.png','18':'assets/maps/regions/Moquegua.png','19':'assets/maps/regions/Pasco.png','20':'assets/maps/regions/Piura.png',
    '21':'assets/maps/regions/Puno.png','22':'assets/maps/regions/San_Martin.png','23':'assets/maps/regions/Tacna.png','24':'assets/maps/regions/Tumbes.png','25':'assets/maps/regions/Ucayali.png'
  };
  const state = {env:'redes', region:null, origin:'redes', province:null, entity:null, mapLevel:'province', homeFocus:0, peruSelected:null, year:'2026', limaScope:'gore'};
  const geoCache = {};
  let enterTimer = null;

  const fmtInt = n => new Intl.NumberFormat('es-PE',{maximumFractionDigits:0}).format(Number(n||0));
  const fmt1 = n => new Intl.NumberFormat('es-PE',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Number(n||0));
  const moneyExact = n => `S/ ${fmtInt(n)}`;
  function moneyShort(n){ n=Number(n||0); if(n>=1e9)return `S/ ${fmt1(n/1e9)} mil M`; if(n>=1e6)return `S/ ${fmt1(n/1e6)} M`; if(n>=1e3)return `S/ ${fmt1(n/1e3)} mil`; return `S/ ${fmtInt(n)}`; }
  const pct = n => `${fmt1(n)}%`;
  const esc = s => String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function regionName(code){ return code==='00'?'Nacional':(D.departments[code]||code); }
  function cleanEntityName(s){ return String(s||'').replace(/^MUNICIPALIDAD (PROVINCIAL|DISTRITAL) DE\s+/i,''); }
  function metricObj(arr){ arr=arr||[0,0,0,0,0]; return {pia:arr[0]||0,pim:arr[1]||0,dev:arr[2]||0,adv:arr[3]||0,pending:arr[4]||0}; }
  function activeYear(){ return state.year; }
  function periodLabel(){ return state.year==='2026' ? '2026 · hasta agosto' : state.year; }
  function periodBadge(){ return state.year==='2026' ? 'Indicadores 2026 · hasta agosto' : `Indicadores ${state.year}`; }
  function seriesMetric(series,year=activeYear()){ return metricObj((series||{})[year]); }
  function shapeMarkup(code, cls='region-shape-img'){
    if(code==='15') return `<div class="lima-shapes"><img class="${cls}" src="assets/maps/regions/Lima_Metropolitana.png" alt=""><img class="${cls}" src="assets/maps/regions/Lima_Provincias.png" alt=""></div>`;
    return `<img class="${cls}" src="${MAP_IMG[code]||'assets/maps/Peru.svg'}" alt="">`;
  }

  function fillSelect(el, codes, includePlaceholder=false){
    el.innerHTML = (includePlaceholder?'<option value="">Selecciona una región</option>':'') + codes.map(c=>`<option value="${c}">${esc(regionName(c))}</option>`).join('');
  }

  function navTo(env){
    clearTimeout(enterTimer); $('#redesHome').classList.remove('is-entering');
    state.env=env;
    $('#navRedes').classList.toggle('active',env==='redes');
    $('#navPeru').classList.toggle('active',env==='peru');
    $('#regionView').classList.add('hidden');
    if(env==='redes'){
      $('#redesHome').classList.remove('hidden'); $('#peruHome').classList.add('hidden');
      state.origin='redes'; state.region=null; state.province=null; state.entity=null;
      $('#homeRegionSelect').value=''; state.homeFocus=0; renderHomeWheel(0,null);
    } else {
      $('#redesHome').classList.add('hidden'); $('#peruHome').classList.remove('hidden');
      state.origin='peru'; state.region=null; state.province=null; state.entity=null;
      renderPeruHome();
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function nodeMarkup(code){
    const src=MAP_IMG[code]||'assets/maps/Peru.svg';
    return `<img src="${src}" alt=""/><span>${esc(regionName(code))}</span>`;
  }

  function renderHomeWheel(focusIndex=0, activeCode=null){
    const host=$('#homeWheel');
    if(!host.dataset.built){
      host.innerHTML=`<div class="wheel-center"><img src="assets/rd-logo.png" alt="Rd"></div>` + REDES.map(c=>`<button type="button" class="wheel-node" data-code="${c}">${nodeMarkup(c)}</button>`).join('');
      host.querySelectorAll('.wheel-node').forEach(btn=>btn.addEventListener('click',()=>selectFromWheel(btn.dataset.code)));
      host.dataset.built='1';
      new ResizeObserver(()=>positionHomeWheel(state.homeFocus, activeCode)).observe(host);
    }
    state.homeFocus=focusIndex;
    positionHomeWheel(focusIndex, activeCode);
  }
  function positionHomeWheel(focusIndex=0, activeCode=null){
    const host=$('#homeWheel'); if(!host) return;
    const rect=host.getBoundingClientRect(); const cx=rect.width/2,cy=rect.height/2,r=rect.width*.39;
    host.querySelectorAll('.wheel-node').forEach((node,i)=>{
      const angle=(-90+(i-focusIndex)*45)*Math.PI/180;
      node.style.left=(cx+Math.cos(angle)*r)+'px'; node.style.top=(cy+Math.sin(angle)*r)+'px';
      node.classList.toggle('active',node.dataset.code===activeCode);
    });
  }
  function selectFromWheel(code){
    const idx=REDES.indexOf(code); $('#homeRegionSelect').value=code; renderHomeWheel(idx,code);
    $('#redesHome').classList.add('is-entering');
    clearTimeout(enterTimer); enterTimer=setTimeout(()=>enterRegion(code,'redes'),760);
  }

  function buildRail(){
    const host=$('#railWheel');
    host.innerHTML=`<div class="wheel-center"><img src="assets/rd-logo.png" alt="Rd"></div>`+REDES.map(c=>`<button type="button" class="wheel-node" data-code="${c}">${nodeMarkup(c)}</button>`).join('');
    host.querySelectorAll('.wheel-node').forEach(btn=>btn.addEventListener('click',()=>switchRailRegion(btn.dataset.code)));
    positionRail();
  }
  function positionRail(){
    const host=$('#railWheel'); if(!host||!state.region)return;
    const selected=REDES.indexOf(state.region); const cx=310,cy=310,r=245;
    host.querySelectorAll('.wheel-node').forEach((node,i)=>{
      let diff=i-selected; while(diff>4)diff-=8; while(diff<-4)diff+=8;
      const angle=diff*45*Math.PI/180;
      node.style.left=(cx+Math.cos(angle)*r)+'px'; node.style.top=(cy+Math.sin(angle)*r)+'px';
      node.style.opacity=Math.abs(diff)<=2?'1':'0';
      node.style.pointerEvents=Math.abs(diff)<=2?'auto':'none';
      node.classList.toggle('active',diff===0);
    });
  }
  function switchRailRegion(code){
    if(!code || code===state.region) return;
    const view=$('#regionView');
    view.classList.add('is-switching');
    state.region=code; positionRail(); $('#dashRegionSelect').value=code;
    setTimeout(()=>{ renderRegion(); view.classList.remove('is-switching'); },360);
  }
  function railStep(step){
    const idx=REDES.indexOf(state.region); switchRailRegion(REDES[(idx+step+REDES.length)%REDES.length]);
  }

  function enterRegion(code,origin){
    $('#redesHome').classList.remove('is-entering');
    state.region=code; state.origin=origin; state.province=null; state.entity=null; state.mapLevel='province'; state.year='2026'; state.limaScope='gore';
    $('#redesHome').classList.add('hidden'); $('#peruHome').classList.add('hidden'); $('#regionView').classList.remove('hidden');
    const redesRail=origin==='redes'; $('#wheelRail').classList.toggle('hidden',!redesRail); $('#peruBackRail').classList.toggle('hidden',redesRail);
    if(redesRail){ buildRail(); fillSelect($('#dashRegionSelect'),REDES); }
    else { fillSelect($('#dashRegionSelect'),Object.keys(D.departments)); renderPeruRailShape(code); }
    $('#dashRegionSelect').value=code;
    renderRegion(); window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderRegion(){
    const code=state.region; const national=code==='00';
    $('#regionTitle').textContent=regionName(code); $('#regionPeriod').textContent=D.meta.historical;
    renderGeneral(code); renderGore(code); renderLocal(code); renderTables(code);
    $('#municipalExplorer').classList.toggle('hidden',national);
    $('#detailGrid').classList.toggle('hidden',national || !REDES.includes(code));
    if(!national){ renderMunicipalExplorer(code); }
  }

  function renderGeneral(code){
    let items;
    if(code==='00') items=[['Capital','Lima'],['Departamentos','25'],['Provincias','196']];
    else if(code==='15' && state.limaScope==='mml') items=[['Ámbito','Lima Metropolitana'],['Provincias','1'],['Distritos','43']];
    else if(code==='15') items=[['Ámbito','Lima Provincias'],['Provincias','9'],['Distritos','128']];
    else items=[['Capital',D.capital[code]||'—'],['Provincias',fmtInt(D.provinceCounts[code]||0)],['Distritos',fmtInt(D.municipalityCounts[code]||0)]];
    const periodHtml=`<div class="general-item period-control"><span>Año</span><select id="periodSelect" class="period-select">${YEARS.map(y=>`<option value="${y}">${y==='2026'?'2026 · hasta agosto':y}</option>`).join('')}</select></div>`;
    const limaHtml=code==='15'?`<div class="general-item period-control lima-scope-control"><span>Ámbito Lima</span><select id="limaScopeSelect" class="period-select"><option value="gore">GORE Lima · Lima Provincias</option><option value="mml">Lima Metropolitana</option></select></div>`:'';
    $('#generalInfo').innerHTML=items.map(([a,b])=>`<div class="general-item"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('') + limaHtml + periodHtml;
    const ps=$('#periodSelect'); ps.value=state.year; ps.addEventListener('change',e=>{state.year=e.target.value;renderPeriodDependent();});
    if(code==='15'){const ls=$('#limaScopeSelect'); ls.value=state.limaScope; ls.addEventListener('change',e=>{state.limaScope=e.target.value; state.province=null; state.entity=null; renderRegion();});}
    $('#regionPeriod').textContent=periodLabel();
  }

  function eligibleEntities(code){
    const rows=D.entities[code]||[];
    if(code!=='15') return rows;
    return state.limaScope==='mml' ? rows.filter(r=>r[2]==='1501') : rows.filter(r=>r[2]!=='1501');
  }
  function aggregateEntitySeries(rows){
    const out={};
    YEARS.forEach(y=>{let pia=0,pim=0,dev=0,pending=0; rows.forEach(r=>{const a=(D.entityHistory[r[0]]||{})[y]; if(a){pia+=Number(a[0]||0);pim+=Number(a[1]||0);dev+=Number(a[2]||0);pending+=Number(a[4]||0);}}); out[y]=[pia,pim,dev,pim?dev/pim*100:0,pending];});
    return out;
  }
  function seriesFor(kind,code){
    if(code==='00') return D.national[kind];
    if(code==='15' && kind==='gore') return state.limaScope==='mml' ? (D.limaSpecial?.mml||{}) : (D.limaSpecial?.gore||D.gore[code]||{});
    if(code==='15' && kind==='local') return aggregateEntitySeries(eligibleEntities(code));
    return kind==='gore'?(D.gore[code]||{}):(D.localDept[code]||{});
  }
  function currentMetric(kind,code){ return seriesMetric(seriesFor(kind,code)); }
  function renderKpis(host, m){
    const items=[['PIM',moneyShort(m.pim)],['Devengado',moneyShort(m.dev)],['Avance',pct(m.adv)],['Por ejecutar',moneyShort(m.pending)]];
    host.innerHTML=items.map(([l,v],i)=>`<div class="kpi" style="--delay:${i*55}ms"><div class="label"><span class="dot" style="background:${i===1?'#25875f':i===2?'#456fd6':i===3?'#7f8ab1':'#f8bf00'}"></span>${l}</div><strong>${v}</strong></div>`).join('');
  }
  function renderGore(code){
    $('#goreTitle').textContent=code==='00'?'Gobiernos Regionales':(code==='15'&&state.limaScope==='mml'?'Municipalidad Metropolitana de Lima':(code==='15'?'Gobierno Regional de Lima':'Gobierno Regional'));
    $('#goreYearBadge').textContent=periodBadge();
    renderKpis($('#goreKpis'),currentMetric('gore',code));
    renderLineChart('goreChart',seriesFor('gore',code),state.year);
  }
  function renderLocal(code){
    $('#localYearBadge').textContent=periodBadge();
    renderKpis($('#localKpis'),currentMetric('local',code));
    renderLineChart('localChart',seriesFor('local',code),state.year);
  }

  function renderLineChart(id, series, highlightYear=null){
    const host=document.getElementById(id); const W=960,H=300,L=66,R=20,T=24,B=44;
    const vals=[]; YEARS.forEach(y=>{const a=series[y]; if(a){vals.push(a[1],a[2]);}}); const max=Math.max(...vals,1); const nice=Math.ceil(max/1e8)*1e8 || max;
    const x=i=>L+i*(W-L-R)/(YEARS.length-1); const y=v=>T+(nice-v)*(H-T-B)/nice;
    let grid=''; for(let i=0;i<=4;i++){const val=nice*(4-i)/4,yy=T+(H-T-B)*i/4; grid+=`<line class="chart-grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text class="chart-axis-label" x="${L-9}" y="${yy+4}" text-anchor="end">${fmt1(val/1e6)}</text>`;}
    const line=(idx,cls,dot,label)=>{let d='',pts='';let started=false;YEARS.forEach((yr,i)=>{const a=series[yr];if(!a){started=false;return;}const v=a[idx],xx=x(i),yy=y(v);d+=(started?'L':'M')+xx.toFixed(1)+','+yy.toFixed(1)+' ';started=true;pts+=`<circle class="${dot}${yr===highlightYear?' year-selected':''}" data-year="${yr}" data-series="${label}" data-value="${v}" cx="${xx}" cy="${yy}" r="${yr===highlightYear?6:4.2}"></circle>`;});return `<path class="${cls}" pathLength="1" d="${d}"/>${pts}`;};
    const labels=YEARS.map((yr,i)=>`<text class="chart-axis-label${yr===highlightYear?' selected-year-label':''}" x="${x(i)}" y="${H-16}" text-anchor="middle">${yr}</text>`).join('');
    const hit=YEARS.map((yr,i)=>{const xx=x(i),left=i===0?L:(x(i-1)+xx)/2,right=i===YEARS.length-1?W-R:(xx+x(i+1))/2;return `<rect class="chart-hit" data-year="${yr}" x="${left}" y="${T}" width="${right-left}" height="${H-T-B}"/>`;}).join('');
    host.innerHTML=`<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de PIM y Devengado">${grid}${highlightYear?`<line class="chart-year-line" x1="${x(YEARS.indexOf(highlightYear))}" x2="${x(YEARS.indexOf(highlightYear))}" y1="${T}" y2="${H-B}"/>`:''}${line(1,'chart-line-pim','chart-dot-pim','PIM')}${line(2,'chart-line-dev','chart-dot-dev','Devengado')}${labels}${hit}</svg><div class="chart-tooltip" role="status" aria-live="polite"></div><div class="chart-legend"><span><i class="legend-dot pim"></i>PIM</span><span><i class="legend-dot dev"></i>Devengado</span></div>`;
    const tip=host.querySelector('.chart-tooltip'); let pinned=false;
    const show=(yr,ev)=>{const a=series[yr]; if(!a)return; tip.innerHTML=`<strong>${yr}</strong><span><b>PIM</b>${moneyExact(a[1])}</span><span><b>Devengado</b>${moneyExact(a[2])}</span><span><b>Avance</b>${pct(a[3])}</span>`; tip.classList.add('show'); if(ev){const r=host.getBoundingClientRect(); let left=ev.clientX-r.left+12, top=ev.clientY-r.top-18; left=Math.min(Math.max(8,left),Math.max(8,r.width-230)); top=Math.max(8,top); tip.style.left=left+'px';tip.style.top=top+'px';}};
    host.querySelectorAll('.chart-hit').forEach(el=>{
      el.addEventListener('pointerenter',e=>{if(!pinned)show(el.dataset.year,e)});
      el.addEventListener('pointermove',e=>{if(!pinned)show(el.dataset.year,e)});
      el.addEventListener('pointerleave',()=>{if(!pinned)tip.classList.remove('show')});
      el.addEventListener('click',e=>{pinned=!pinned;show(el.dataset.year,e);if(!pinned)tip.classList.remove('show')});
    });
  }

  function provinceCodes(code){
    const set=new Set(eligibleEntities(code).map(r=>r[2])); return [...set].sort();
  }
  function provinceName(pc){ return D.provinces[pc]||pc; }
  function entitiesForProvince(dc,pc){ return eligibleEntities(dc).filter(r=>r[2]===pc); }
  function provincialEntity(dc,pc){ const list=entitiesForProvince(dc,pc); return list.find(r=>r[0]===pc+'01') || list.find(r=>/PROVINCIAL/i.test(r[1])) || list[0] || null; }

  function renderMunicipalExplorer(code){
    state.province=null; state.entity=null; state.mapLevel='province';
    const pcs=provinceCodes(code);
    $('#provinceSelect').innerHTML=pcs.map(pc=>`<option value="${pc}">${esc(provinceName(pc))}</option>`).join('');
    $('#provinceQuickList').innerHTML=pcs.map(pc=>`<button class="quick-chip" type="button" data-pc="${pc}">${esc(provinceName(pc))}</button>`).join('');
    $$('#provinceQuickList .quick-chip').forEach(b=>b.addEventListener('click',()=>selectProvince(b.dataset.pc,true)));
    $('#provinceBack').classList.add('hidden'); $('#districtSelectorRow').classList.add('hidden');
    $('#territoryMapTitle').textContent='Provincias'; $('#territoryMapSub').textContent=regionName(code);
    if(pcs.length){ $('#provinceSelect').value=pcs[0]; selectProvince(pcs[0],false); }
    renderProvinceMap(code,pcs[0]||null);
  }

  function selectProvince(pc, zoomToDistrict=true){
    if(!pc)return; state.province=pc; const dc=state.region; $('#provinceSelect').value=pc;
    $$('#provinceQuickList .quick-chip').forEach(b=>b.classList.toggle('active',b.dataset.pc===pc));
    const ent=provincialEntity(dc,pc); if(ent) selectEntity(ent[0],false);
    const list=entitiesForProvince(dc,pc);
    $('#districtSelect').innerHTML=list.map(r=>`<option value="${r[0]}">${esc(cleanEntityName(r[1]))}</option>`).join('');
    if(ent) $('#districtSelect').value=ent[0];
    if(zoomToDistrict){ state.mapLevel='district'; $('#provinceBack').classList.remove('hidden'); $('#districtSelectorRow').classList.remove('hidden'); $('#territoryMapTitle').textContent=provinceName(pc); $('#territoryMapSub').textContent='Municipalidades distritales'; renderDistrictMap(pc,ent?ent[0]:null); }
  }

  function selectEntity(ec, updateMap=true){
    state.entity=ec; const rows=D.entities[state.region]||[]; const row=rows.find(r=>r[0]===ec); if(!row)return;
    $('#entityType').textContent=/PROVINCIAL/i.test(row[1])?'Municipalidad provincial':'Municipalidad distrital';
    $('#entityTitle').textContent=cleanEntityName(row[1]); $('#districtSelect').value=ec;
    const hist=D.entityHistory[ec]||{}; const m=seriesMetric(hist); renderKpis($('#entityKpis'),m);
    $('#entityYearBadge').textContent=periodBadge();
    renderLineChart('entityChart',hist,state.year);
    renderFunctions(ec); renderProjects(ec);
    if(updateMap && state.mapLevel==='district') renderDistrictMap(state.province,ec);
  }

  function renderFunctions(ec){
    const list=D.functions[ec]||[]; const host=$('#functionList');
    if(!list.length){host.innerHTML='<div class="empty-detail">Sin detalle por función en la extracción actual.</div>';return;}
    const top=list.slice(0,10),max=Math.max(...top.map(r=>r[2]),1);
    host.innerHTML=top.map(r=>`<div class="rank-row"><div><div class="rank-name">${esc(r[1])}</div><div class="rank-bar"><div class="rank-fill" style="width:${Math.max(1,r[2]/max*100)}%"></div></div></div><div class="rank-val">${moneyShort(r[2])}</div></div>`).join('');
  }
  function renderProjects(ec){
    const list=D.projects[ec]||[]; const host=$('#projectList');
    if(!list.length){host.innerHTML='<div class="empty-detail">Sin detalle de proyectos para esta municipalidad.</div>';return;}
    host.innerHTML=list.slice(0,16).map(r=>`<div class="project-row"><div class="project-code">${esc(r[0])}</div><div class="project-name">${esc(r[1])}</div><div class="project-meta"><span>PIM ${moneyShort(r[2])}</span><span>${pct(r[4])}</span></div></div>`).join('');
  }

  async function fetchGeo(kind){
    if(geoCache[kind]) return geoCache[kind];
    const sources=GEO_URLS[kind]||[]; let lastErr=null;
    for(const url of sources){
      const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(), url.startsWith('data/')?2500:15000);
      try{
        const res=await fetch(url,{signal:ctrl.signal,cache:'force-cache',mode:url.startsWith('http')?'cors':'same-origin'});
        if(!res.ok) throw new Error('HTTP '+res.status);
        const data=await res.json();
        if(!data || !Array.isArray(data.features) || !data.features.length) throw new Error('GeoJSON vacío');
        geoCache[kind]=data; return data;
      }catch(e){ lastErr=e; } finally{ clearTimeout(timer); }
    }
    throw lastErr || new Error('Cartografía no disponible');
  }
  function fcode(f){const p=f.properties||{};return String(p.ubigeo||p.ubigeo_departamento||p.ubigeo_provincia||p.IDDIST||p.FIRST_IDPR||p.FIRST_IDDP||p.code||'').padStart(p.ubigeo?String(p.ubigeo).length:0,'0')}
  function fname(f){const p=f.properties||{};return p.nombre||p.nombdep||p.NOMBDEP||p.NOMBPROV||p.NOMBDIST||p.name||''}
  function allCoords(geom,out=[]){ if(!geom)return out; const c=geom.coordinates; const walk=x=>{if(!Array.isArray(x))return;if(typeof x[0]==='number'&&typeof x[1]==='number')out.push(x);else x.forEach(walk)};walk(c);return out; }
  function geoPath(geom,project){
    if(!geom)return''; const parts=[];
    const ringPath=ring=>ring.map((p,i)=>{const [x,y]=project(p);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`}).join(' ')+' Z';
    if(geom.type==='Polygon') geom.coordinates.forEach(r=>parts.push(ringPath(r)));
    else if(geom.type==='MultiPolygon') geom.coordinates.forEach(poly=>poly.forEach(r=>parts.push(ringPath(r))));
    else if(geom.type==='GeometryCollection') geom.geometries.forEach(g=>parts.push(geoPath(g,project)));
    return parts.join(' ');
  }
  function projector(features,W,H,pad=24){
    const pts=[];features.forEach(f=>allCoords(f.geometry,pts)); if(!pts.length)return p=>[W/2,H/2];
    let minx=Infinity,maxx=-Infinity,miny=Infinity,maxy=-Infinity;pts.forEach(([x,y])=>{minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y)});
    const sx=(W-2*pad)/(maxx-minx||1),sy=(H-2*pad)/(maxy-miny||1),s=Math.min(sx,sy),ox=(W-(maxx-minx)*s)/2,oy=(H-(maxy-miny)*s)/2;
    return ([x,y])=>[ox+(x-minx)*s,H-(oy+(y-miny)*s)];
  }
  function bboxCenter(f,project){const pts=allCoords(f.geometry,[]);if(!pts.length)return[0,0];let sx=0,sy=0;pts.forEach(p=>{const q=project(p);sx+=q[0];sy+=q[1]});return[sx/pts.length,sy/pts.length]}
  function drawGeo(host,features,selected,onClick,labels=true,hasDataCodes=null,focusSelected=false){
    const W=900,H=560,proj=projector(features,W,H,30); const dataSet=hasDataCodes?new Set(hasDataCodes):null;
    const paths=features.map(f=>{const c=fcode(f),name=fname(f),cls=['map-feature',c===selected?'selected':'',dataSet&&dataSet.has(c)?'has-data':'',focusSelected&&selected&&c!==selected?'faded':''].filter(Boolean).join(' ');return `<path class="${cls}" data-code="${esc(c)}" d="${geoPath(f.geometry,proj)}"><title>${esc(name)}</title></path>`}).join('');
    let txt=''; if(labels&&features.length<=25){txt=features.map(f=>{const c=fcode(f),name=fname(f),[x,y]=bboxCenter(f,proj);return `<text class="map-label${focusSelected&&selected&&c!==selected?' faded-label':''}" x="${x}" y="${y}">${esc(titleCase(name))}</text>`}).join('')}
    let anim='';
    if(focusSelected&&selected){const sf=features.find(f=>fcode(f)===selected);if(sf){const [cx,cy]=bboxCenter(sf,proj),scale=1.55,targetX=W*.31,targetY=H*.50,e=targetX-scale*cx,f=targetY-scale*cy;anim=`<animateTransform attributeName="transform" type="matrix" from="1 0 0 1 0 0" to="${scale} 0 0 ${scale} ${e.toFixed(2)} ${f.toFixed(2)}" dur="0.55s" fill="freeze" calcMode="spline" keySplines="0.22 0.84 0.28 1"/>`;}}
    host.classList.toggle('is-focused',Boolean(focusSelected&&selected));
    host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet"><g class="geo-layer">${anim}${paths}${txt}</g></svg>`;
    host.querySelectorAll('.map-feature').forEach(p=>p.addEventListener('click',()=>onClick(p.dataset.code)));
  }
  function titleCase(s){return String(s||'').toLowerCase().replace(/(^|\s|[-])([a-záéíóúñ])/g,(m,a,b)=>a+b.toUpperCase())}
  function fallbackRegionMap(code,msg='Cartografía interactiva no disponible en este momento'){
    const img=MAP_IMG[code]||'assets/maps/Peru.svg'; $('#territoryMap').innerHTML=`<div class="map-fallback"><img src="${img}" alt="Mapa de ${esc(regionName(code))}"><span>${esc(msg)}</span></div>`;
  }

  async function renderProvinceMap(dc,selected){
    const host=$('#territoryMap'),status=$('#territoryMapStatus'); status.textContent='Cargando mapa…';
    fallbackRegionMap(dc,'Cargando límites provinciales…');
    try{const geo=await fetchGeo('prov');const fs=geo.features.filter(f=>fcode(f).startsWith(dc));drawGeo(host,fs,selected,pc=>selectProvince(pc,true),true,provinceCodes(dc));status.textContent='';}
    catch(e){status.textContent='Silueta disponible · usa el selector mientras se restablece la cartografía interactiva.';fallbackRegionMap(dc,'Vista territorial disponible');}
  }
  async function renderDistrictMap(pc,selected){
    const host=$('#territoryMap'),status=$('#territoryMapStatus');status.textContent='Cargando distritos…';
    fallbackRegionMap(state.region,'Cargando límites distritales…');
    try{const geo=await fetchGeo('dist');const fs=geo.features.filter(f=>fcode(f).startsWith(pc));const entities=entitiesForProvince(state.region,pc).map(r=>r[0]);drawGeo(host,fs,selected,ec=>{if(entities.includes(ec))selectEntity(ec,true)},fs.length<=25,entities,Boolean(selected));status.textContent='';}
    catch(e){status.textContent='Silueta disponible · el selector de municipalidades sigue activo.';fallbackRegionMap(state.region,'Vista territorial disponible');}
  }

  function renderTables(code){
    const g=seriesFor('gore',code); const goreYears=[state.year]; const rows=goreYears.map(y=>[y,...(g[y]||[0,0,0,0,0]).slice(1)]);
    $('#goreTable').innerHTML=tableHTML(['Año','PIM','Devengado','Avance','Por ejecutar'],rows,true);
    const yr=activeYear(); let mrows=[];
    const source=code==='00'?Object.values(D.entities).flat():eligibleEntities(code);
    source.forEach(r=>{const h=(D.entityHistory[r[0]]||{})[yr]; if(!h)return; if(code==='00')mrows.push([r[1],D.departments[r[0].slice(0,2)]||'',provinceName(r[2]),h[1],h[2],h[3],h[4]]); else mrows.push([r[1],provinceName(r[2]),h[1],h[2],h[3],h[4]]);});
    mrows.sort((a,b)=>(b[code==='00'?3:2]||0)-(a[code==='00'?3:2]||0));
    $('#muniTableSub').textContent=`${yr==='2026'?'2026 · hasta agosto':yr} · ${fmtInt(mrows.length)} municipalidades`;
    $('#muniTable').innerHTML=code==='00'?tableHTML(['Municipalidad','Región','Provincia','PIM','Devengado','Avance','Por ejecutar'],mrows,false):tableHTML(['Municipalidad','Provincia','PIM','Devengado','Avance','Por ejecutar'],mrows,false);
  }
  function tableHTML(headers,rows,historical){
    const moneyCols=historical?[1,2,4]:(headers.map((h,i)=>/PIM|Devengado|ejecutar/.test(h)?i:-1).filter(i=>i>=0)); const pctCol=headers.findIndex(h=>h==='Avance');
    return `<thead><tr>${headers.map((h,i)=>`<th class="${moneyCols.includes(i)||i===pctCol?'num':''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<td class="${i===0&&!historical?'name-cell ':''}${moneyCols.includes(i)||i===pctCol?'num':''}">${moneyCols.includes(i)?moneyExact(v):i===pctCol?pct(v):esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  }

  function rowsForGoreExcel(){const s=seriesFor('gore',state.region),ys=[state.year];return ys.map(y=>[y,...(s[y]||[0,0,0,0,0]).slice(1)]);}
  function rowsForMuniExcel(){const code=state.region,yr=activeYear(),src=code==='00'?Object.values(D.entities).flat():eligibleEntities(code),out=[];src.forEach(r=>{const h=(D.entityHistory[r[0]]||{})[yr];if(!h)return;if(code==='00')out.push([r[1],D.departments[r[0].slice(0,2)]||'',provinceName(r[2]),h[1],h[2],h[3],h[4]]);else out.push([r[1],provinceName(r[2]),h[1],h[2],h[3],h[4]]);});return out;}
  function downloadExcel(name,headers,rows){
    const style='<style>table{border-collapse:collapse;font-family:Arial}th{background:#252c43;color:#fff}th,td{border:1px solid #ccc;padding:6px}td.num{text-align:right}</style>';
    const html=`<html><head><meta charset="utf-8">${style}</head><body><table><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
    const blob=new Blob(['\ufeff',html],{type:'application/vnd.ms-excel'}); downloadBlob(blob,name+'.xls');
  }
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
  function downloadChart(id,name){
    const svg=document.querySelector(`#${id} svg`); if(!svg)return;
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width','1920'); clone.setAttribute('height','600');
    clone.querySelectorAll('.chart-hit').forEach(n=>n.remove());
    clone.querySelectorAll('.chart-grid').forEach(n=>{n.setAttribute('stroke','#e9ecf2');n.setAttribute('stroke-width','1');});
    clone.querySelectorAll('.chart-axis-label').forEach(n=>{n.setAttribute('fill','#7b8190');n.setAttribute('font-size','11');n.setAttribute('font-family','Arial, sans-serif');});
    clone.querySelectorAll('.selected-year-label').forEach(n=>{n.setAttribute('fill','#456fd6');n.setAttribute('font-weight','700');});
    clone.querySelectorAll('.chart-line-pim').forEach(n=>{n.setAttribute('fill','none');n.setAttribute('stroke','#252c43');n.setAttribute('stroke-width','3');n.removeAttribute('style');});
    clone.querySelectorAll('.chart-line-dev').forEach(n=>{n.setAttribute('fill','none');n.setAttribute('stroke','#f8bf00');n.setAttribute('stroke-width','3');n.removeAttribute('style');});
    clone.querySelectorAll('.chart-dot-pim').forEach(n=>n.setAttribute('fill','#252c43'));
    clone.querySelectorAll('.chart-dot-dev').forEach(n=>n.setAttribute('fill','#f8bf00'));
    clone.querySelectorAll('.chart-year-line').forEach(n=>{n.setAttribute('stroke','#9db4ee');n.setAttribute('stroke-width','2');n.setAttribute('stroke-dasharray','5 5');});
    const xml='<?xml version="1.0" encoding="UTF-8"?>'+new XMLSerializer().serializeToString(clone);
    const img=new Image(); const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'}); const url=URL.createObjectURL(blob);
    img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=600;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,1920,600);URL.revokeObjectURL(url);canvas.toBlob(b=>downloadBlob(b,name+'.png'),'image/png',1)};
    img.onerror=()=>{URL.revokeObjectURL(url);};
    img.src=url;
  }

  function renderPeruRailShape(code){ $('#peruRailShape').innerHTML=shapeMarkup(code,'rail-region-img'); }
  async function renderPeruHome(){
    fillSelect($('#peruDeptSelect'),Object.keys(D.departments),true); $('#peruDeptSelect').value='';state.peruSelected=null;updatePeruSide(null);
    const host=$('#peruMap'),status=$('#peruMapStatus'); host.innerHTML='<div class="map-fallback"><img src="assets/maps/Peru.svg" alt="Mapa del Perú"><span>Cargando regiones…</span></div>';status.textContent='Cargando límites territoriales…';
    try{const geo=await fetchGeo('dept');drawGeo(host,geo.features,null,code=>selectPeruDept(code),geo.features.length<=25,Object.keys(D.departments),false);status.textContent='';}
    catch(e){status.textContent='Selecciona una región en el menú superior.';host.innerHTML='<div class="map-fallback"><img src="assets/maps/Peru.svg" alt="Mapa del Perú"><span>Mapa nacional</span></div>';}
  }
  function selectPeruDept(code){
    state.peruSelected=code; $('#peruDeptSelect').value=code; updatePeruSide(code);
    if(geoCache.dept) drawGeo($('#peruMap'),geoCache.dept.features,code,c=>selectPeruDept(c),true,Object.keys(D.departments),true);
  }
  function updatePeruSide(code){
    $('#peruSideTitle').textContent=code?regionName(code):'Perú'; const btn=$('#openPeruRegion');btn.disabled=!code;
    $('#peruSideShape').innerHTML=code?shapeMarkup(code,'peru-side-region-img'):`<img class="peru-side-region-img" src="assets/maps/Peru.svg" alt="">`;
    if(!code){$('#peruSideMetrics').innerHTML='';return;}
    if(code==='15'){
      const g=seriesMetric(D.limaSpecial?.gore||{},'2026'),m=seriesMetric(D.limaSpecial?.mml||{},'2026');
      $('#peruSideMetrics').innerHTML=[['PIM GORE Lima',moneyShort(g.pim)],['Avance GORE Lima',pct(g.adv)],['PIM Lima Metropolitana',moneyShort(m.pim)],['Avance Lima Metropolitana',pct(m.adv)]].map(([a,b])=>`<div class="mini-kpi"><span>${a}</span><strong>${b}</strong></div>`).join('');
      return;
    }
    const g=seriesMetric(seriesFor('gore',code),'2026'),l=seriesMetric(seriesFor('local',code),'2026');
    $('#peruSideMetrics').innerHTML=[['PIM GORE',moneyShort(g.pim)],['Avance GORE',pct(g.adv)],['PIM municipal',moneyShort(l.pim)],['Avance municipal',pct(l.adv)]].map(([a,b])=>`<div class="mini-kpi"><span>${a}</span><strong>${b}</strong></div>`).join('');
  }

  function renderPeriodDependent(){
    if(!state.region)return; renderGeneral(state.region); renderGore(state.region); renderLocal(state.region); renderTables(state.region);
    if(state.entity) selectEntity(state.entity,false);
  }

  // events
  fillSelect($('#homeRegionSelect'),REDES,true); fillSelect($('#peruDeptSelect'),Object.keys(D.departments),true); renderHomeWheel(0,null);
  // Precarga silenciosa de departamentos y provincias para que el mapa aparezca rápido al navegar.
  setTimeout(()=>{ fetchGeo('dept').catch(()=>{}); fetchGeo('prov').catch(()=>{}); },250);
  $('#homeRegionSelect').addEventListener('change',e=>{if(!e.target.value)return;selectFromWheel(e.target.value)});
  $('#navRedes').addEventListener('click',()=>navTo('redes')); $('#navPeru').addEventListener('click',()=>navTo('peru')); $('#brandHome').addEventListener('click',()=>navTo('redes'));
  $('#railPrev').addEventListener('click',()=>railStep(-1)); $('#railNext').addEventListener('click',()=>railStep(1)); $('#backToWheel').addEventListener('click',()=>navTo('redes')); $('#backToPeru').addEventListener('click',()=>navTo('peru'));
  $('#dashRegionSelect').addEventListener('change',e=>{const c=e.target.value;if(state.origin==='redes')switchRailRegion(c);else{state.region=c;renderPeruRailShape(c);renderRegion();}});
  $('#provinceSelect').addEventListener('change',e=>selectProvince(e.target.value,true)); $('#districtSelect').addEventListener('change',e=>selectEntity(e.target.value,true));
  $('#provinceBack').addEventListener('click',()=>{state.mapLevel='province';$('#provinceBack').classList.add('hidden');$('#districtSelectorRow').classList.add('hidden');$('#territoryMapTitle').textContent='Provincias';$('#territoryMapSub').textContent=regionName(state.region);renderProvinceMap(state.region,state.province)});
  $('#gorePng').addEventListener('click',()=>downloadChart('goreChart',`REDES_${regionName(state.region)}_GORE_2017_2026`));
  $('#localPng').addEventListener('click',()=>downloadChart('localChart',`REDES_${regionName(state.region)}_Municipalidades_2017_2026`));
  $('#entityPng').addEventListener('click',()=>state.entity&&downloadChart('entityChart',`REDES_${state.entity}_2017_2026`));
  $('#goreExcel').addEventListener('click',()=>downloadExcel(`REDES_${regionName(state.region)}_GORE_${state.year}`,['Año','PIM','Devengado','Avance (%)','Por ejecutar'],rowsForGoreExcel()));
  $('#muniExcel').addEventListener('click',()=>{const national=state.region==='00',yr=activeYear();downloadExcel(`REDES_${regionName(state.region)}_Municipalidades_${yr}`,national?['Municipalidad','Región','Provincia','PIM','Devengado','Avance (%)','Por ejecutar']:['Municipalidad','Provincia','PIM','Devengado','Avance (%)','Por ejecutar'],rowsForMuniExcel())});
  $('#peruDeptSelect').addEventListener('change',e=>e.target.value&&selectPeruDept(e.target.value)); $('#openPeruRegion').addEventListener('click',()=>state.peruSelected&&enterRegion(state.peruSelected,'peru'));
})();
