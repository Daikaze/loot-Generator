/* Loot Generator v0.2.1 — Foundry VTT v14. Optional Open5e V2 online source. */
const ID = 'loot-generator';
const {ApplicationV2, DialogV2} = foundry.applications.api;
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n, low, high, fallback = low) => Number.isFinite(Number(n)) ? Math.min(high, Math.max(low, Math.trunc(Number(n)))) : fallback;
const randomSeed = () => String(Math.floor(Math.random() * 4294967295));
const OPEN5E_API = 'https://api.open5e.com/v2/';
const onlinePriceByRarity = [100, 400, 4000, 40000, 200000];
const rarities = ['common','uncommon','rare','very rare','legendary'];
const shopTypes = {
  blacksmith:'Blacksmith', alchemist:'Alchemist', general:'General Store', arcanist:'Magic Shop',
  jeweler:'Jeweler', herbalist:'Herbalist', outfitter:'Adventuring Gear', armorer:'Armorer',
  bookstore:'Bookshop', blackmarket:'Black Market', temple:'Temple Supplies'
};
const themes = ['generic','bandit','goblin','undead','fey','arcane','noble','dragon'];
const rawCatalog = [
  'Dagger|blacksmith|2|common','Longsword|blacksmith|15|common','Greatsword|blacksmith|50|common',
  'Warhammer|blacksmith|15|common','Handaxe|blacksmith|5|common','Spear|blacksmith|1|common',
  'Fine Steel Ingot|blacksmith|8|common','Mithral Fragments|blacksmith|120|rare',
  'Leather Armor|armorer|10|common','Chain Mail|armorer|75|common','Shield|armorer|10|common',
  'Plate Armor|armorer|1500|common','Reinforced Buckler|armorer|40|uncommon',
  'Healing Draught|alchemist|50|common','Antitoxin|alchemist|50|common',
  'Acid Flask|alchemist|25|common','Alchemist Fire|alchemist|50|common','Mana Elixir|alchemist|180|uncommon',
  'Rations|general|1|common','Rope, 50 ft|general|1|common','Torch|general|0.01|common',
  'Waterskin|general|0.2|common','Blanket|general|0.5|common','Lantern|general|5|common',
  'Enchanted Ink|arcanist|80|uncommon','Spell Crystal|arcanist|350|rare',
  'Rune-etched Focus|arcanist|100|uncommon','Scroll Case|arcanist|2|common',
  'Silver Ring|jeweler|15|common','Cut Garnet|jeweler|60|uncommon','Sapphire|jeweler|250|rare',
  'Ruby|jeweler|300|rare','Emerald|jeweler|600|very rare',
  'Medicinal Herbs|herbalist|4|common','Wolfsbane|herbalist|12|uncommon','Moonflower|herbalist|60|rare',
  'Climbing Kit|outfitter|25|common','Grappling Hook|outfitter|2|common','Tent|outfitter|2|common',
  'Spellbook|bookstore|50|common','Arcane Primer|bookstore|25|common','Ancient Codex|bookstore|200|rare',
  'False Identity Papers|blackmarket|95|uncommon','Smuggled Relic|blackmarket|320|rare',
  'Holy Water|temple|25|common','Incense|temple|1|common','Silver Holy Symbol|temple|25|common'
];
const catalog = rawCatalog.map(line => {const [name,category,priceGP,rarity] = line.split('|');return {name,category,priceGP:Number(priceGP),rarity,source:'Built-in'};});
const themed = {
  generic:['Old Coin','Weathered Brooch','Stamped Copper Token','Curious Stone'],
  bandit:['Stolen Signet','Wanted Poster','Highwayman Badge','Coin Pouch'],
  goblin:['Crude Idol','Bent Dagger','Goblin Charm','Stolen Trinket'],
  undead:['Grave Dust','Bone Amulet','Tarnished Reliquary','Funerary Coin'],
  fey:['Moonpetal','Feyglass Shard','Living Leaf','Whisperseed'],
  arcane:['Unstable Crystal','Arcane Shard','Scribed Fragment','Broken Wand'],
  noble:['Wax-Sealed Letter','Family Crest','Jeweled Button','Silken Purse'],
  dragon:['Scorched Scale','Dragonbone Chip','Ancient Coin','Smoky Gem']
};
const powers = ['Once per long rest, gain advantage on a Perception check','Once per long rest, emit bright light for 10 minutes','Once per long rest, move 10 ft without provoking opportunity attacks','Once per long rest, gain +1 AC until the start of your next turn','Once per long rest, gain advantage on one ability check'];
const quirks = ['Whispers near ancient ruins','Glows during a full moon','Becomes cold when danger approaches','Attracts small moths','Changes color at dawn'];
const bases = ['Ring','Blade','Amulet','Shield','Wand','Cloak','Boots','Staff','Orb','Gloves'];
const epithets = ['Ashen Echoes','Stormbound Light','Dawn','Hollow Stars','Frost','Silence','Shifting Tides'];
const shopsSuffix = ['of the Ember Guild','& Sons','at the Crossroads','of the Silver Fox','of the Wandering Moon'];
function seeded(seed) {let h=2166136261;for(const ch of String(seed))h=Math.imul(h ^ ch.charCodeAt(0),16777619);let a=h>>>0;return () => {a+=0x6D2B79F5;let t=a;t=Math.imul(t ^ t>>>15,t|1);t^=t+Math.imul(t ^ t>>>7,t|61);return ((t ^ t>>>14)>>>0)/4294967296;};}
const pick = (r, arr) => arr[Math.floor(r()*arr.length)];
function sample(r, items, n) {const pool=[...items],out=[];while(pool.length && out.length<n)out.push(pool.splice(Math.floor(r()*pool.length),1)[0]);return out;}
const rarityLevel = x => Math.max(0,rarities.indexOf(String(x?.name ?? x?.key ?? x ?? 'common').toLowerCase().replace(/[_-]/g,' ')));
const textPlain = value => String(value ?? '').replace(/<[^>]*>/g, ' ').trim().slice(0,1800);
const costInGP = (raw, fallback = 0) => {
  if(typeof raw === 'number') return Math.max(0,raw);
  if(typeof raw === 'string') {
    const match=raw.match(/^\s*([\d.]+)\s*(pp|gp|ep|sp|cp)?/i);
    if(match)return Number(match[1])*({pp:10,gp:1,ep:0.5,sp:0.1,cp:0.01}[match[2]?.toLowerCase()??'gp']??1);
  }
  const value=Number(raw?.value??raw?.cost??NaN), denom=String(raw?.unit??raw?.denomination??'gp').toLowerCase();
  return Number.isFinite(value) ? Math.max(0,value*({pp:10,gp:1,ep:0.5,sp:0.1,cp:0.01}[denom]??1)) : fallback;
};
const onlineCategory = (item, magic) => {
  const blob=[item?.category?.name, item?.category?.key,item?.type,item?.name].join(' ').toLowerCase();
  if(magic){if(/potion|elixir/.test(blob))return 'alchemist';return 'arcanist';}
  if(/armor|shield/.test(blob))return 'armorer';
  if(/weapon|sword|bow|dagger|axe/.test(blob) || item?.is_weapon)return 'blacksmith';
  if(/herb|plant|poison/.test(blob))return 'herbalist';
  if(/gem|jewel|ring/.test(blob))return 'jeweler';
  if(/book|scroll|paper/.test(blob))return 'bookstore';
  if(/tool|rope|pack|tent|climb/.test(blob))return 'outfitter';
  return 'general';
};
function mapOpen5eItem(item, magic = false) {
  if(!item || typeof item.name!=='string' || !item.name.trim())return null;
  const rarity=String(item.rarity?.name??item.rarity?.key??(magic?'uncommon':'common')).toLowerCase().replace(/[_-]/g,' ');
  const tier=rarityLevel(rarity);
  const category=onlineCategory(item,magic);
  const priceGP=costInGP(item.cost,magic ? onlinePriceByRarity[tier] : 0);
  const sourceName=textPlain(item.document?.display_name??item.document?.name??'Open5e');
  return normalizeSource({name:item.name,category,rarity,priceGP,
    description:textPlain(item.desc??item.description),source:'Open5e · '+sourceName,
    sourceUrl:'https://open5e.com/'+(magic?'magic-items':'items'),
    itemType:'loot' // Remote metadata is not a complete dnd5e attack/equipment schema.
  });
}
async function loadOpen5e(value, search='') {
  const path=value==='open5e-magic'?'magicitems':value==='open5e-items'?'items':null;
  if(!path)throw Error('Unknown online source');
  const isMagic=path==='magicitems';
  const url=new URL(path+'/',OPEN5E_API);
  url.searchParams.set('limit','150');
  if(String(search).trim())url.searchParams.set('name__icontains',String(search).trim().slice(0,80));
  let response;
  try {response=await fetch(url.toString(),{method:'GET',mode:'cors',credentials:'omit',headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});}
  catch(err){throw Error('Open5e connection failed (offline, timeout, or browser CORS): '+err.message);}
  if(!response.ok)throw Error('Open5e returned HTTP '+response.status);
  const payload=await response.json();
  if(!Array.isArray(payload?.results))throw Error('Unexpected response from Open5e');
  return payload.results.map(x=>mapOpen5eItem(x,isMagic)).filter(Boolean);
}
function normalizeSource(item) {return {name:String(item.name ?? 'Item'),category:String(item.category ?? 'general'),rarity:String(item.rarity ?? 'common').toLowerCase(),priceGP:Math.max(0,Number(item.priceGP)||0),description:String(item.description ?? ''),uuid:item.uuid ?? null,img:item.img ?? null,resourceId:item.resourceId ?? null,itemType:item.itemType??null,sourceUrl:item.sourceUrl??null,source:item.source ?? 'Source'};}
function generate(kind, options={}, source=[]) {
  if(!['loot','shop','magic'].includes(kind))throw Error('Unknown generator type');
  const opts={...options,seed:String(options.seed || randomSeed())},r=seeded(opts.seed);
  const extra=source.map(normalizeSource);
  let entries=[],title='',subtitle='',coins=null,lines=[];
  if(kind==='loot') {
    const theme=themed[opts.theme] ? opts.theme : 'generic';
    const cr=clamp(opts.cr,0,30,4),n=clamp(opts.count,1,35,6),tier=Math.min(4,Math.floor(cr/6));
    const pool=[...themed[theme].map(name=>({name,category:theme,rarity:'common',priceGP:(tier+1)*(2+Math.floor(r()*12)),source:'Original'})),...catalog.filter(x=>x.category==='jeweler' && rarityLevel(x.rarity)<=tier),...extra.filter(x=>rarityLevel(x.rarity)<=tier)];
    entries=sample(r,pool,n).map(x=>({...x,qty:1+(tier>2 && r()<.3?1:0)}));
    const gold=Math.floor((cr+2)*(opts.hoard==='hoard'?12:3)*(1+Math.floor(r()*8))/2),silver=Math.floor(r()*10);
    coins={gp:gold,sp:silver,cp:Math.floor(r()*10)};
    title=(opts.hoard==='hoard'?'Treasure Hoard':'Loot')+' · '+theme;subtitle='CR '+cr+' · '+entries.length+' items';
    lines=['Original treasure concepts and optional linked source items'];
  } else if(kind==='shop') {
    const cat=shopTypes[opts.category]?opts.category:'general',wealth={poor:.65,normal:1,rich:1.8,luxury:3.5}[opts.wealth]??1;
    const cap=clamp(opts.maxRarity,0,4,1),n=clamp(opts.count,1,40,12);
    const eligible=[...catalog.filter(x=>x.category===cat || (cat==='general'&&x.category==='outfitter') || (cat==='blackmarket'&&rarityLevel(x.rarity)>=1)),...extra.filter(x=>x.category===cat || cat==='blackmarket' || cat==='arcanist' || (cat==='general'&&rarityLevel(x.rarity)===0))].filter(x=>rarityLevel(x.rarity)<=cap);
    entries=sample(r,eligible,n).map(x=>({...x,qty:1+Math.floor(r()*Math.max(2,wealth*4)),priceGP:Math.round(x.priceGP*wealth*(.85+.3*r())*100)/100,generatedShopPrice:true}));
    title=shopTypes[cat]+' '+pick(r,shopsSuffix);subtitle=(opts.wealth||'normal')+' economy · '+entries.length+' stock types';
    lines=['Generated prices are estimates; use the NPC Shops editor to adjust them.'];
  } else {
    const rarity=rarities.includes(opts.rarity)?opts.rarity:'rare',n=clamp(opts.count,1,20,3),matching=extra.filter(x=>rarityLevel(x.rarity)===rarityLevel(rarity));
    if(opts.preferSource==='yes')entries=sample(r,matching,n).map(x=>({...x,qty:1}));
    while(entries.length<n)entries.push({name:pick(r,bases)+' of '+pick(r,epithets),category:'magic',rarity,qty:1,priceGP:[85,425,2300,11000,55000][rarityLevel(rarity)],description:'Homebrew concept: '+pick(r,powers)+'. Quirk: '+pick(r,quirks)+'. GM approval required.',source:'Original homebrew'});
    title='Magic Items · '+rarity;subtitle=entries.length+' item concepts or linked items';
    lines=['Homebrew descriptions are ideas, not automatic mechanical effects.'];
  }
  return {kind,seed:opts.seed,created:new Date().toISOString(),title,subtitle,lines,coins,entries};
}
async function sourceItems(value, search='') {
  if(value==='open5e-items' || value==='open5e-magic')return loadOpen5e(value,search);
  if(!value || value==='builtin')return [];
  if(value==='world')return (game.items?.contents??[]).slice(0,1200).map(x=>documentItem(x));
  if(value==='crafting') {
    if(!game.modules.get('gathering-crafting')?.active)return [];
    let db;try{db=game.settings.get('gathering-crafting','database');}catch{return [];}
    return (db?.materials??[]).slice(0,500).map(x=>({name:x.name,category:/alchemy|herb|ingredient/i.test(String(x.group))?'alchemist':'blacksmith',rarity:x.rarity||'common',priceGP:Number(x.priceGP??x.price??3),description:x.description,img:x.img,resourceId:x.id,source:'Gathering & Crafting'}));
  }
  if(value.startsWith('pack:')) {
    const pack=game.packs.get(value.slice(5));if(!pack || pack.documentName!=='Item')return [];
    const index=await pack.getIndex({fields:['img','type','system.price','system.rarity']});
    return [...index.values()].slice(0,2500).map(row=>documentItem(row,pack));
  }
  return [];
}
function documentItem(doc,pack) {
  const data=doc.toObject?doc.toObject():doc,price=data.system?.price;
  const number=Number(typeof price==='number'?price:price?.value??0);
  const factor={pp:10,gp:1,ep:.5,sp:.1,cp:.01}[price?.denomination??'gp']??1;
  const type=data.type;
  const category=type==='weapon'?'blacksmith':type==='equipment'?'armorer':type==='consumable'?'alchemist':type==='tool'?'outfitter':'general';
  return {name:data.name,category,rarity:data.system?.rarity?.value??data.system?.rarity??'common',priceGP:number*factor,uuid:pack?'Compendium.'+pack.collection+'.'+data._id:doc.uuid,img:data.img,description:'Linked Foundry item',source:pack?'Compendium':'World'};
}
function option(value,label,selected){return '<option value="'+escapeHTML(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+escapeHTML(label)+'</option>';}
function field(label,name,html){return '<label>'+escapeHTML(label)+html+'</label>';}
function select(label,name,values,current){return field(label,name,'<select name="'+name+'">'+values.map(([id,v])=>option(id,v,current)).join('')+'</select>');}
function input(label,name,value,min,max){return field(label,name,'<input type="number" name="'+name+'" min="'+min+'" max="'+max+'" value="'+escapeHTML(value)+'">');}
function coinText(coins){return coins?coins.gp+' gp · '+coins.sp+' sp · '+coins.cp+' cp':'';}
function itemText(x){return (x.qty??1)+' × '+x.name+(x.priceGP!=null?' · '+x.priceGP+' gp':'')+(x.description?' — '+x.description:'');}
function resultText(r){return [r.title,r.subtitle,'Seed: '+r.seed,...(r.lines||[]),...(r.coins?['Currency: '+coinText(r.coins)]:[]),...(r.entries||[]).map(itemText)].join('\n');}
function chatHTML(r){return '<section class="lg-chat"><h2>'+escapeHTML(r.title)+'</h2><p>'+escapeHTML(r.subtitle)+'</p>'+(r.coins?'<p>'+escapeHTML(coinText(r.coins))+'</p>':'')+'<ul>'+r.entries.map(x=>'<li>'+escapeHTML(itemText(x))+'</li>').join('')+'</ul><small>Loot Generator</small></section>';}
async function resolveItem(item,qty) {
  if(game.system.id!=='dnd5e')throw Error('This action requires D&D 5e.');
  let doc=item.uuid?await fromUuid(item.uuid):null;
  if(!doc && game.items?.getName)doc=game.items.getName(item.name);
  const data=doc?.documentName==='Item'?doc.toObject():{name:item.name,type:['weapon','equipment','consumable','tool','loot'].includes(item.itemType)?item.itemType:'loot',img:item.img||'icons/svg/item-bag.svg',system:{quantity:1,price:{value:Math.max(0,Number(item.priceGP)||0),denomination:'gp'},description:{value:'<p>'+escapeHTML(item.description||'Generated loot concept')+'</p>'}}};
  delete data._id;delete data.folder;delete data.sort;delete data.ownership;
  data.system??={};data.system.quantity=clamp(qty,1,999,1);
  if(item.generatedShopPrice) data.system.price={value:Math.max(0,Number(item.priceGP)||0),denomination:'gp'};
  if(item.resourceId){data.flags??={};data.flags['gathering-crafting']={...(data.flags['gathering-crafting']??{}),resourceId:item.resourceId};}
  return data;
}
const defaults={loot:{theme:'generic',cr:'4',hoard:'hoard',count:'6',source:'builtin',search:'',seed:''},shop:{category:'blacksmith',wealth:'normal',maxRarity:'1',count:'12',source:'builtin',search:'',seed:''},magic:{rarity:'rare',count:'3',preferSource:'yes',source:'builtin',search:'',seed:''}};
const tabLabels={loot:'Loot',shop:'Shops',magic:'Magic Items'};
function notice(s,level='info'){ui.notifications?.[level]?.('Loot Generator: '+s);}
class LootApp extends ApplicationV2 {
  static DEFAULT_OPTIONS={id:'loot-generator-workbench',classes:['loot-generator'],position:{width:1060,height:740},window:{title:'Loot Generator v0.2.1',resizable:true,minimizable:true,icon:'fa-solid fa-gem'}};
  constructor(...args){super(...args);this.tab='loot';this.fields=structuredClone(defaults);this.result=null;this.showHistory=false;this.busy=false;this.dragItems=[];}
  async _renderHTML(){const div=document.createElement('div');div.innerHTML=this.markup();return div;}
  _replaceHTML(result,content){content.replaceChildren(...result.childNodes);}
  _onRender(...args){super._onRender(...args);this.element.onclick=e=>{const btn=e.target.closest('button[data-action]');if(btn && this.element.contains(btn))this.action(btn.dataset.action,btn.dataset);};this.element.onchange=e=>{if(e.target.name)this.fields[this.tab][e.target.name]=e.target.value;};this.element.oninput=e=>{if(e.target.name)this.fields[this.tab][e.target.name]=e.target.value;};
    this.element.ondragstart=e=>{
      const row=e.target.closest('.lg-item[draggable="true"]');
      if(!row || !this.element.contains(row))return;
      const payload=this.dragItems[Number(row.dataset.index)];
      if(!payload){e.preventDefault();notice('Item is not prepared for dragging yet','warn');return;}
      if(!e.dataTransfer){e.preventDefault();return;}
      e.dataTransfer.setData('text/plain',JSON.stringify({type:'Item',data:foundry.utils.deepClone(payload)}));
      e.dataTransfer.effectAllowed='copy';
    };
  }
  snapshot(){for(const el of this.element.querySelectorAll('input[name],select[name]'))this.fields[this.tab][el.name]=el.value;}
  markup(){
    const f=this.fields[this.tab],sourceNames=[['builtin','Built-in Catalog'],['open5e-items','Online · Open5e Equipment'],['open5e-magic','Online · Open5e Magic Items'],['world','World Items'],...(game.modules.get('gathering-crafting')?.active?[['crafting','Gathering & Crafting Materials']]:[]),...[...(game.packs??[])].filter(p=>p.documentName==='Item').map(p=>['pack:'+p.collection,'Compendium · '+(p.metadata.label??p.collection)])];
    const nav=Object.entries(tabLabels).map(([key,label])=>'<button data-action="tab" data-tab="'+key+'" class="lg-tab '+(key===this.tab?'active':'')+'">'+label+'</button>').join('');
    let fields='';
    if(this.tab==='loot')fields=select('Loot Theme','theme',themes.map(x=>[x,x]),f.theme)+input('Challenge Rating','cr',f.cr,0,30)+select('Treasure Type','hoard',[['hoard','Treasure Hoard'],['individual','Individual Loot']],f.hoard)+input('Number of Items','count',f.count,1,35);
    if(this.tab==='shop')fields=select('Shop Type','category',Object.entries(shopTypes),f.category)+select('Economy','wealth',[['poor','Poor'],['normal','Normal'],['rich','Rich'],['luxury','Luxury']],f.wealth)+select('Maximum Rarity','maxRarity',rarities.map((x,i)=>[String(i),x]),f.maxRarity)+input('Stock Variety','count',f.count,1,40);
    if(this.tab==='magic')fields=select('Rarity','rarity',rarities.map(x=>[x,x]),f.rarity)+input('Number of Items','count',f.count,1,20)+select('Creation Mode','preferSource',[['yes','Prefer existing items'],['no','Generate homebrew concepts']],f.preferSource);
    fields+=select('Item Source','source',sourceNames,f.source)+field('Online Search (optional)','search','<input name="search" value="'+escapeHTML(f.search||'')+'" placeholder="e.g. sword, potion">')+field('Repeatable Seed','seed','<input name="seed" value="'+escapeHTML(f.seed)+'" placeholder="Blank = random">');
    const r=this.result,entries=r?'<p class="lg-tip"><i class="fas fa-hand-pointer"></i> '+(game.system.id==='dnd5e'?'Drag an item onto a character or NPC inventory.':'Drag & Drop requires D&D 5e.')+'</p><div class="lg-list">'+r.entries.map((x,i)=>'<div class="lg-item" draggable="'+(game.system.id==='dnd5e'?'true':'false')+'" data-index="'+i+'" title="Drag into an Actor sheet"><div class="lg-entry"><i class="fas fa-grip-vertical lg-grip"></i><img draggable="false" src="'+escapeHTML(x.img||'icons/svg/item-bag.svg')+'" alt=""><div><strong>'+escapeHTML((x.qty??1)+' × '+x.name)+'</strong><small>'+escapeHTML(x.description||x.source||'')+'</small><small>'+escapeHTML(x.source||'')+'</small></div></div><span>'+escapeHTML(x.rarity||'')+'<br>'+escapeHTML(x.priceGP==null?'':x.priceGP+' gp')+'</span></div>').join('')+'</div>':'';
    const history=(game.settings.get(ID,'history')?.records??[]);
    return '<div class="lg-layout"><aside><div class="lg-brand">◈ LOOT GENERATOR</div><nav>'+nav+'</nav><p>GM ONLY · FOUNDRY V14</p></aside><main><header><h1>'+escapeHTML(tabLabels[this.tab])+'</h1><button data-action="history">History</button></header><section class="lg-scroll">'+(this.showHistory?'<div class="lg-panel"><h3>Saved Results</h3>'+history.map((x,i)=>'<button class="lg-hist" data-action="load" data-index="'+i+'">'+escapeHTML(x.title)+' · '+escapeHTML(x.created?.slice(0,16)||'')+'</button>').join('')+'</div>':'')+'<div class="lg-panel"><h3>01 · Generator Settings</h3><div class="lg-fields">'+fields+'</div><button class="lg-primary" data-action="generate"'+(this.busy?' disabled':'')+'>Generate '+escapeHTML(tabLabels[this.tab])+'</button></div><div class="lg-panel"><h3>02 · Generated Result</h3>'+(r?'<h2>'+escapeHTML(r.title)+'</h2><p>'+escapeHTML(r.subtitle)+'</p>'+(r.coins?'<p class="lg-gold">'+escapeHTML(coinText(r.coins))+'</p>':'')+entries+'<div class="lg-actions"><button data-action="gm-chat">GM Chat</button><button data-action="share">Share with Players</button><button data-action="save">Save</button><button data-action="copy">Copy</button><button data-action="journal">Journal</button><button data-action="export">Export JSON</button>'+(r.kind==='shop'&&game.modules.get('npc-shops')?.active?'<button data-action="npc-shop">Send to NPC Shops</button>':'')+(r.kind!=='shop'&&game.system.id==='dnd5e'?'<button data-action="give">Give Items to Token</button>':'')+'</div>':'<p>Configure the generator and click Generate.</p>')+'</div></section></main></div>';
  }
  async action(action,data){if(!game.user.isGM||this.busy)return;this.snapshot();if(action==='tab'){this.tab=data.tab;this.result=null;this.showHistory=false;return this.render({force:true});}if(action==='history'){this.showHistory=!this.showHistory;return this.render({force:true});}
    if(action==='load'){this.result=(game.settings.get(ID,'history')?.records??[])[clamp(data.index,0,39)];this.showHistory=false;return this.render({force:true});}
    if(action==='generate'){this.busy=true;try{const opts={...this.fields[this.tab]};this.result=generate(this.tab,opts,await sourceItems(opts.source));}catch(e){console.error(ID,e);notice(e.message,'error');}finally{this.busy=false;await this.render({force:true});}return;}
    if(!this.result)return;
    try{
      if(action==='gm-chat'||action==='share')await ChatMessage.create({speaker:{alias:'Loot Generator'},content:chatHTML(this.result),...(action==='gm-chat'?{whisper:game.users.filter(u=>u.isGM).map(u=>u.id)}:{})});
      if(action==='save'){const records=[structuredClone(this.result),...(game.settings.get(ID,'history')?.records??[])].slice(0,40);await game.settings.set(ID,'history',{records});notice('Result saved');}
      if(action==='copy'){await navigator.clipboard.writeText(resultText(this.result));notice('Copied');}
      if(action==='export')foundry.utils.saveDataToFile(JSON.stringify(this.result,null,2),'application/json','loot-generator-'+this.result.kind+'.json');
      if(action==='journal')await JournalEntry.create({name:this.result.title,pages:[{name:'Generated Content',type:'text',text:{format:1,content:chatHTML(this.result)}}]});
      if(action==='give'){if(game.system.id!=='dnd5e')throw Error('Requires D&D 5e');const actor=canvas?.tokens?.controlled?.[0]?.actor;if(!actor)throw Error('Select an Actor token');if(!await DialogV2.confirm({window:{title:'Give items?'},content:'<p>Add generated items to '+escapeHTML(actor.name)+'? Coins are not transferred.</p>'}))return;const items=[];for(const x of this.result.entries)items.push(await resolveItem(x,x.qty??1));await actor.createEmbeddedDocuments('Item',items);notice('Items added to '+actor.name);}
      if(action==='npc-shop'){if(game.system.id!=='dnd5e'||!game.modules.get('npc-shops')?.active)throw Error('Requires NPC Shops and D&D 5e');const token=canvas?.tokens?.controlled?.[0],actor=token?.actor;if(actor?.type!=='npc')throw Error('Select an NPC token');if(!await DialogV2.confirm({window:{title:'Replace shop inventory?'},content:'<p>Replace stock for '+escapeHTML(actor.name)+'? Transaction history and merchant settings will be preserved.</p>'}))return;const existing=actor.getFlag('npc-shops','shop')??{},stock=[];for(const x of this.result.entries){stock.push({id:crypto.randomUUID?.()??String(Date.now()+Math.random()),item:await resolveItem(x,1),quantity:clamp(x.qty,1,999,1),priceCp:Math.round(Math.max(0,Number(x.priceGP)||0)*100),unlimited:false});}await actor.setFlag('npc-shops','shop',{enabled:true,open:true,allowSelling:true,sellRate:.5,ledger:[],...existing,stock,enabled:true});await token.document.setFlag('npc-shops','merchant',true);notice('Stock sent to NPC Shops');}
    }catch(e){console.error(ID,e);notice(e.message,'error');}
  }
}
let windowInstance;
function open(){if(!game.user?.isGM)return notice('GM only','warn');if(windowInstance?.rendered){windowInstance.bringToFront();return windowInstance;}windowInstance=new LootApp();windowInstance.render({force:true});return windowInstance;}
Hooks.once('init',()=>{
  game.settings.register(ID,'history',{name:'Loot Generator History',scope:'user',config:false,type:Object,default:{records:[]}});
  game.keybindings.register(ID,'open',{name:'Open Loot Generator',editable:[{key:'KeyL',modifiers:['CONTROL','SHIFT']}],onDown:()=>{open();return true;},restricted:true});
  Hooks.on('getSceneControlButtons',controls=>{if(!game.user?.isGM||!controls.tokens?.tools)return;controls.tokens.tools.lootGenerator={name:'lootGenerator',title:'Loot Generator',icon:'fa-solid fa-gem',order:51,button:true,visible:true,onChange:()=>open()};});
});
Hooks.once('ready',()=>{const mod=game.modules.get(ID);if(mod)mod.api=Object.freeze({open,generate});});
export {generate,open};