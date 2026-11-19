// Equipment ownership, hand rules, per-copy enchantments, drops, shops and review UI.
DD.gear = (function () {
  const {el}=DD.u, out={}, p=()=>DD.save.profile;
  const names={weapon:'Main hand',offhand:'Off hand',armor:'Armor',head:'Head',acc1:'Accessory 1',acc2:'Accessory 2'};
  const by=id=>DD.data.gearById[id];
  const active=()=>DD.data.activeGear;
  const rank={common:0,uncommon:1,rare:2,veryrare:3,legendary:4};
  out.slotsFor=it=>it.slot==='weapon'?(it.hands===2?['weapon']:['weapon','offhand']):it.slot==='shield'?['offhand']:it.slot==='acc'?['acc1','acc2']:[it.slot];
  out.color=r=>DD.S.gear.colors[r]||'#aaa';
  out.price=it=>it.source==='starter'?0:(DD.S.gear.price[it.rarity]||({legendary:0}[it.rarity]))||0;
  out.sellPrice=it=>Math.floor(out.price(it)*DD.S.economy.sellPct);
  out.canSell=it=>it.source!=='starter'&&it.rarity!=='legendary';
  out.equippedIds=()=>DD.data.gearSlots.map(s=>p().equipment[s]).filter(Boolean);
  out.bagCount=id=>p().gearBag.filter(x=>x===id).length;
  out.owned=id=>out.bagCount(id)+out.equippedIds().filter(x=>x===id).length;
  out.give=id=>{if(by(id))p().gearBag.push(id);};
  out.locked=()=>!!(DD.game&&DD.game.combat)||!!(DD.save.run&&DD.save.run.battle);
  out.plan=function(profile,id,slot){
    const it=by(id);if(!it||!out.slotsFor(it).includes(slot))return null;
    const eq=Object.assign({},profile.equipment),removed=[];
    const remove=s=>{if(eq[s])removed.push(eq[s]);delete eq[s];};
    remove(slot);
    if(slot==='weapon'&&it.hands===2)remove('offhand');
    if(slot==='offhand'&&by(eq.weapon)&&by(eq.weapon).hands===2)remove('weapon');
    if(it.slot==='acc'&&['boots','gloves','cloak'].includes(it.category))for(const s of ['acc1','acc2'])if(s!==slot&&by(eq[s])&&by(eq[s]).category===it.category)remove(s);
    if(it.slot==='acc')for(const s of ['acc1','acc2'])if(s!==slot&&eq[s]===id)remove(s); // never the same accessory twice
    eq[slot]=id;return {eq,removed};
  };
  function clamp(){
    DD.game.resources();
    for(const r of [DD.game.run,DD.save.run])if(r&&typeof r.hp==='number'){
      const s=DD.stats.compute(p());r.hp=Math.min(r.hp,s.maxHP);r.atp=Math.min(r.atp,s.maxATP);
    }
    if(DD.game.run)DD.game.persist();else if(DD.save.run)DD.save.saveRun(DD.save.run);
  }
  // Gear found this expedition stays in escrow (run.earned.gear) but can be worn now. Worn finds are tracked in earned.worn
  // so a death or Flee/Leave still takes them back; a found piece taken off returns to escrow, an owned one to the bag.
  const escrow=()=>DD.game&&DD.game.run&&DD.game.run.earned||null; // read only: never creates fields
  out.found=()=>{const e=escrow();return e?e.gear:[];};
  const take=(list,id)=>{const i=list?list.indexOf(id):-1;if(i<0)return false;list.splice(i,1);return true;};
  const stow=id=>{const e=escrow();if(e&&take(e.worn,id))e.gear.push(id);else p().gearBag.push(id);};
  out.equip=function(id,slot){
    if(out.locked())return false;
    const e=escrow(),plan=out.plan(p(),id,slot);if(!plan)return false;
    if(p().gearBag.includes(id))take(p().gearBag,id);else if(e&&take(e.gear,id))(e.worn||(e.worn=[])).push(id);else return false;
    plan.removed.forEach(stow);p().equipment=plan.eq;clamp();DD.save.save();return true;
  };
  out.unequip=function(slot){if(out.locked()||!p().equipment[slot])return false;stow(p().equipment[slot]);delete p().equipment[slot];clamp();DD.save.save();return true;};
  // Forfeit: strip worn finds from their slots (the Flee/Leave keep-gear perk banks them instead).
  out.forfeitWorn=function(e,keep){
    for(const id of (e&&e.worn)||[]){if(keep)continue;const s=DD.data.gearSlots.find(x=>p().equipment[x]===id);if(s)delete p().equipment[s];}
  };
  out.preview=changes=>DD.stats.compute(Object.assign({},p(),{equipment:Object.assign({},p().equipment,changes)}));
  out.restoreInstances=function(profile){
    const src=profile.gearInstances||{},clean={};
    for(const [id,v] of Object.entries(src)){
      const base=v&&by(v.baseId);if(!id.startsWith('instance-')||!base||!base.modern||base.slot!=='armor'||!['acid','electrical','oxidative','toxin'].includes(v.enchant))continue;
      const it=JSON.parse(JSON.stringify(base));it.id=id;it.baseId=base.id;it.enchant=v.enchant;
      it.perks.resist=Object.assign({},it.perks.resist,{[v.enchant]:Math.max(.5,(it.perks.resist||{})[v.enchant]||0)});
      DD.data.gearById[id]=it;clean[id]={baseId:base.id,enchant:v.enchant};
    }
    profile.gearInstances=clean;
  };
  out.prepare=function(profile, equipNewKit=false){
    profile.equipment=profile.equipment||{};profile.gearBag=profile.gearBag||[];
    profile.startersIssued=profile.startersIssued||{};out.restoreInstances(profile);
    // Move older head/shield pieces into their actual slots without losing copies.
    const eq=profile.equipment,armor=by(eq.armor);
    if(armor&&armor.slot==='head'&&!eq.head){eq.head=eq.armor;delete eq.armor;}
    if(armor&&armor.slot==='shield'&&!eq.offhand){eq.offhand=eq.armor;delete eq.armor;}
    for(const s of Object.keys(eq))if(!DD.data.gearSlots.includes(s)||!by(eq[s])||!out.slotsFor(by(eq[s])).includes(s)){
      if(by(eq[s]))profile.gearBag.push(eq[s]);delete eq[s];
    }
    if(by(eq.weapon)&&by(eq.weapon).hands===2&&eq.offhand){profile.gearBag.push(eq.offhand);delete eq.offhand;}
    if(!profile.startersIssued[profile.classId]){
      if(equipNewKit){for(const s of ['weapon','offhand','armor']){if(eq[s])profile.gearBag.push(eq[s]);delete eq[s];}}
      const owned=new Set(profile.gearBag.concat(Object.values(eq)));
      for(const id of DD.data.starterKits[profile.classId]||[]){
        if(owned.has(id))continue; // already have this piece (worn from another class's kit), no duplicate
        const it=by(id),slot=out.slotsFor(it)[0];
        if(!eq[slot]&&!(slot==='offhand'&&by(eq.weapon)&&by(eq.weapon).hands===2))eq[slot]=id;
        else profile.gearBag.push(id);
      }
      profile.startersIssued[profile.classId]=true;
    }
    // Starter gear from other classes' kits can't be sold, so it would sit in the bag forever (every new save starts as a Macrophage).
    // Drop unworn off-class starters from the bag; switching back to that class issues its kit again.
    const mine=new Set(DD.data.starterKits[profile.classId]||[]);
    profile.gearBag=profile.gearBag.filter(id=>{const it=by(id);return !(it&&it.source==='starter'&&!mine.has(id));});
    for(const k of Object.keys(profile.startersIssued))if(k!==profile.classId)profile.startersIssued[k]=false;
    profile.gearV=1;
  };
  out.perks=function(profile){
    const result={damage:{},vsType:{},basicVs:{},resist:{},convert:{},immune:[]};
    for(const slot of DD.data.gearSlots){
      const it=by((profile.equipment||{})[slot]);if(!it||!it.modern)continue;
      for(const [k,v]of Object.entries(it.perks||{})){
        if(['damage','vsType','basicVs'].includes(k)){for(const [t,n]of Object.entries(v))result[k][t]=(result[k][t]||0)+n;}
        else if(['resist','convert'].includes(k)){for(const [t,n]of Object.entries(v))result[k][t]=Math.max(result[k][t]||0,n);}
        else if(k==='immune')result.immune.push(...v);
        else if(k==='costMult')result[k]=(result[k]||1)*v;
        else if(typeof v==='number')result[k]=(result[k]||0)+v;
        else result[k]=v;
      }
    }return result;
  };
  out.enchantCost=()=>250+DD.save.profile.level*10;
  out.enchantWhy=function(id,type){
    const it=by(id);if(out.locked()||(DD.save.run&&DD.save.run.kind!=='town'))return 'Finish the expedition first';
    if(!it||!it.modern||it.slot!=='armor'||!out.owned(id))return 'Choose owned body armor';
    if(!['acid','electrical','oxidative','toxin'].includes(type))return 'Choose a resistance';
    const base=by(it.baseId)||it;
    if((base.perks.resist||{})[type]>=.5||it.enchant===type)return 'This resistance is already present';
    if(p().glucose<out.enchantCost())return 'Not enough glucose';return '';
  };
  out.enchant=function(id,type){
    if(out.enchantWhy(id,type))return false;
    const base=by(id).baseId||id,uid='instance-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
    const slot=DD.data.gearSlots.find(s=>p().equipment[s]===id);
    p().glucose-=out.enchantCost();p().gearInstances[uid]={baseId:base,enchant:type};out.restoreInstances(p());
    if(slot)p().equipment[slot]=uid;else p().gearBag[p().gearBag.indexOf(id)]=uid;
    DD.save.save();return true;
  };
  out.rollChest=function(r,region,boss){
    const floor=(DD.game.run&&DD.game.run.floorIdx)||0;
    const pool=active().filter(it=>!['starter','specialty','boss'].includes(it.source)&&(!it.region||it.region===region)&&
      (it.source!=='deep'||boss||floor>=1||DD.derrick.chestMinTier()>0));
    return DD.u.weightedPick(r,pool,it=>(it.region===region?3:1)*(it.rarity==='veryrare'?(boss?2:.4):2)).id;
  };
  out.openChest=function(c){if(c.taken)return;c.taken=true;DD.game.reward('gear',c.item);DD.game.say('Found '+by(c.item).name+'. You can wear it now; return safely to keep it.');DD.game.persist();};
  // Town gear: a fresh shuffle of common/uncommon pieces per visit; rarely (rareChance per visit) one slot is a rare field piece instead. Never very rare or legendary.
  out.shopStock=function(seed){const S=DD.S.townShop,rng=DD.rng(seed^0x6ea7),ids=DD.u.shuffle(rng,active().filter(it=>it.source==='basic'&&rank[it.rarity]<=1)).slice(0,S.gearSlots).map(it=>it.id);
    if(rng()<S.rareChance)ids[ids.length-1]=DD.u.pick(rng,active().filter(it=>it.source==='field'&&it.rarity==='rare')).id;return ids;};
  out.specialtyStock=function(regions){return active().filter(it=>it.source==='specialty'&&(!it.region||regions.includes(it.region))).map(it=>it.id);};
  out.rareStock=function(r){const it=DD.u.pick(r,active().filter(it=>['field','specialty'].includes(it.source)&&it.rarity==='rare'));return {id:it.id,price:Math.round(out.price(it)*DD.S.merchant.priceMult),sold:false};};
  out.buyRare=function(n){const s=n.rare;if(!s||s.sold||p().glucose<s.price)return false;p().glucose-=s.price;s.sold=true;out.give(s.id);return true;};
  out.fxLines=function(it){
    if(!it.modern)return ['Legacy item: retained for existing saves; no longer found in new loot.'];
    const lines=[];for(const [k,n]of Object.entries(it.stats))lines.push((n>=0?'+':'')+n+' '+({defense:'Armor',power:'Power',maxHP:'max HP',maxATP:'max ATP'}[k]||k));
    if(it.attack)lines.push('+'+it.attack+' basic attack power');
    if(it.perks.block)lines.push('Block +'+Math.round(it.perks.block*100)+' percentage points');
    if(it.staffKit)lines.push('Wizard spells: '+DD.data.staffKits[it.staffKit].map(s=>s.name).join(' / '));
    if(it.enchant)lines.push('Golgi enchantment: half '+it.enchant+' damage');
    return lines.concat(it.rules||[]);
  };
  out.info=(it,extra)=>el('div',{class:'shopinfo ginfo',style:{'--rc':out.color(it.rarity)}},el('b',{class:'gname'},it.name),
    el('div',{class:'chips'},el('span',{class:'chip'},it.rarity),el('span',{class:'chip'},it.slot==='weapon'?it.wtype+' · '+(it.hands||1)+' hand'+(it.hands===2?'s':''):it.weight||it.category||it.slot),it.legacy?el('span',{class:'chip warn'},'Legacy vault'):null),
    extra,el('ul',{class:'fxl'},out.fxLines(it).map(t=>el('li',null,t))),el('div',{class:'small dim'},it.desc));
  out.diff=function(id,slot){
    const plan=out.plan(p(),id,slot),a=DD.stats.compute(p()),b=DD.stats.compute(Object.assign({},p(),{equipment:plan.eq}));
    const rows=['maxHP','maxATP','power','defense','blockCut'].filter(k=>a[k]!==b[k]).map(k=>el('div',{class:b[k]>a[k]?'up':'down'},k+': '+(+a[k].toFixed(2))+' → '+(+b[k].toFixed(2))));
    const item=by(id);
    if(item.slot==='weapon')rows.push(el('div',null,'Basic weapon: '+(item.damageType||'physical')+' · +'+(item.attack||0)+' attack power'+(slot==='offhand'?' · 50% strike strength':'')));
    return el('div',{class:'diff'},el('div',null,plan.removed.length?'Replaces '+plan.removed.map(x=>by(x).name).join(' and '):'Empty '+names[slot]),...rows);
  };
  let filter='all',back=null;
  out.screen=function(fn){
    if(fn)back=fn;const ui=DD.ui,profile=p();ui.mode='gear';if(filter!=='supplies')drainArmed=false;const rerender=()=>out.screen();
    const locked=out.locked(),counts={},found={};profile.gearBag.forEach(id=>{if(by(id))counts[id]=(counts[id]||0)+1;});
    out.found().forEach(id=>{if(by(id)){counts[id]=counts[id]||0;found[id]=(found[id]||0)+1;}});
    const cards=Object.keys(counts).map(by).filter(it=>filter==='all'?!it.legacy:(filter==='legacy'?it.legacy:it.slot===filter&&!it.legacy)).sort((a,b)=>a.name.localeCompare(b.name));

    const slotCards=DD.data.gearSlots.map(slot=>{
      const it=by(profile.equipment[slot]);
      const empty=slot==='offhand'&&by(profile.equipment.weapon)&&by(profile.equipment.weapon).hands===2?'Occupied by two-handed weapon':'Empty';
      return el('div',{class:'gearcard'},el('b',null,names[slot]),it?out.info(it):el('div',null,empty),
        it?el('button',{class:'btn',disabled:locked,onclick:()=>{out.unequip(slot);rerender();}},'Unequip'):null);
    });
    const bagCards=cards.map(it=>{
      const choices=out.slotsFor(it).map(slot=>el('div',null,out.diff(it.id,slot),
        el('button',{class:'btn',disabled:locked,onclick:()=>{out.equip(it.id,slot);rerender();}},'Equip: '+names[slot])));
      const tag=[counts[it.id]?'In bag ×'+counts[it.id]:'',found[it.id]?'Found this expedition ×'+found[it.id]+' (lost if you die or flee)':''].filter(Boolean).join(' · ');
      return el('div',{class:'gearcard'},out.info(it,el('small',null,tag)),...choices);
    });
    const filters=[['all','All'],['weapon','Weapons'],['shield','Shields'],['armor','Armor'],['head','Head'],['acc','Accessories'],['legacy','Legacy vault'],['supplies','Supplies']]
      .map(([v,label])=>el('button',{class:'btn small'+(filter===v?' on':''),'aria-pressed':String(filter===v),onclick:()=>{filter=v;rerender();}},label));
    ui.mount(el('div',{class:'screen menu'},el('h1',null,'Equipment'),
      el('p',{class:'small dim'},'Any class can use any equipment. Two-handed weapons occupy both hands. Off-hand weapons strike at 50% strength.'),
      el('button',{class:'btn',onclick:()=>(back||ui.menu)()},'Back'),
      locked?el('p',{class:'warn'},'Equipment cannot change during an active or saved battle.'):null,
      el('div',{class:'gslots'},slotCards),el('div',{class:'toolrow2'},filters),filter==='supplies'?supplies(rerender):el('div',{class:'gslots'},bagCards)));

  };
  // Supplies tab: only what matters outside battle. O-Neg Bag and Creatine Shake top you up between fights;
  // Lymph Drain ends a dungeon expedition early, banking earnings, exactly as it does in a fight.
  const FIELD_USE={tonic:'heal',atpReserve:'atp',lymphDrain:'drain'};
  let drainArmed=false;
  const resources=()=>{const G=DD.game,r=DD.save.run;return G.run||(r&&!r.kind?r:G.resources());};
  out.fieldWhy=function(id){
    const how=FIELD_USE[id];if(!how)return 'Use in battle';
    if(how==='drain')return DD.game.drainWhy();
    if(out.locked())return 'Not during a battle';if(!DD.combat.count(id))return 'None left';
    const r=resources(),st=DD.game.stats();
    if(how==='heal'&&r.hp>=st.maxHP)return 'Already at full HP';if(how==='atp'&&r.atp>=st.maxATP)return 'Already at full ATP';return '';
  };
  out.useField=function(id){
    if(out.fieldWhy(id))return false;
    const G=DD.game;if(FIELD_USE[id]==='drain'){drainArmed=false;return G.drain();}
    const r=resources(),st=G.stats(),I=DD.S.items;
    if(FIELD_USE[id]==='heal')r.hp=Math.min(st.maxHP,r.hp+Math.round(st.maxHP*I.tonic.healPct));else r.atp=Math.min(st.maxATP,r.atp+Math.round(st.maxATP*I.atpReserve.atpPct));
    G.consumeItem(id);G.syncResources(r);
    if(G.run)G.persist();else{if(r!==p())DD.save.saveRun(r);DD.save.save();}
    return true;
  };
  function supplies(rerender){
    const r=resources(),st=DD.game.stats(),ids=Object.keys(FIELD_USE).filter(id=>DD.combat.count(id));
    const btn=id=>{const why=out.fieldWhy(id);
      if(id!=='lymphDrain'||why)return el('button',{class:'btn small',type:'button',disabled:!!why,title:why,onclick:()=>{out.useField(id);rerender();}},why||'Use');
      return drainArmed?el('button',{class:'btn small primary',type:'button',onclick:()=>out.useField(id)},'Confirm: return to the '+DD.data.town(DD.game.drainTown()).name)
        :el('button',{class:'btn small',type:'button',onclick:()=>{drainArmed=true;rerender();}},'Use');};
    return el('div',{class:'stack'},
      el('div',{class:'chips'},el('span',{class:'chip'},'HP '+Math.round(r.hp)+'/'+st.maxHP+' · ATP '+Math.round(r.atp)+'/'+st.maxATP)),
      ids.length?ids.map(id=>{const d=DD.data.items[id];
        return el('div',{class:'shoprow',style:{alignSelf:'stretch'}},el('div',{class:'shopinfo'},el('b',null,d.name),el('span',{class:'chip'},'×'+DD.combat.count(id)+(d.cap?' / '+d.cap:'')),
          el('div',{class:'small'},d.tip),el('div',{class:'small dim'},d.real)),btn(id));})
        :el('p',{class:'small dim'},'No O-Neg Bags, Creatine Shakes or Lymph Drains on you. The plasma cell shop in every lymph node town sells them.'),
      el('p',{class:'small dim'},'Other supplies are used from the Items menu in battle.'));
  }
  out.summary=()=>out.equippedIds().map(id=>by(id).name).join(', ')||'nothing equipped';
  return out;
})();
