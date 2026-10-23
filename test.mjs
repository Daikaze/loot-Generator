import assert from 'node:assert/strict';
const hooks={};class Base{constructor(){this.rendered=false;}render(){this.rendered=true;return Promise.resolve(this);}bringToFront(){} _onRender(){} }
globalThis.foundry={applications:{api:{ApplicationV2:Base,DialogV2:{confirm:async()=>true}}},utils:{saveDataToFile:()=>{},deepClone:structuredClone}};
globalThis.Hooks={once:(name,fn)=>hooks[name]=fn,on:(name,fn)=>hooks[name]=fn};
globalThis.ui={notifications:{info(){},warn(){},error(x){throw new Error(x)}}};globalThis.canvas={tokens:{controlled:[]}};
const data=new Map(),mod={active:true};const cfg={user:{isGM:true},system:{id:'dnd5e'},modules:new Map([['loot-generator',mod],['npc-shops',{active:true}]]),settings:{register:(id,key,value)=>data.set(key,value.default),get:(id,key)=>data.get(key),set:async(id,key,v)=>data.set(key,v)},keybindings:{register(){}},packs:[],items:{contents:[]},users:[]};globalThis.game=cfg;
const {generate,open,sourceItems,mapOpen5eItem,resolveItem,LootApp}=await import('./scripts/main.mjs');hooks.init();hooks.ready();
for(const kind of ['loot','shop','magic']){const opts={seed:'abc',theme:'goblin',category:'alchemist',count:10,rarity:'rare'};const a=generate(kind,opts),b=generate(kind,opts);assert.deepEqual({...a,created:null},{...b,created:null});assert.ok(a.entries.length>0);}
assert.throws(()=>generate('npc'),/Unknown/);
for(const cat of ['blacksmith','alchemist','general','arcanist','jeweler','herbalist','outfitter','armorer','bookstore','blackmarket','temple'])assert.ok(generate('shop',{category:cat,count:10,seed:'abc',maxRarity:4}).entries.length>0);
for(const rarity of ['common','uncommon','rare','very rare','legendary'])assert.equal(generate('magic',{seed:'r',rarity,count:12}).entries.length,12);
const original={name:'Online Sword',category:'blacksmith',rarity:'uncommon',priceGP:99,source:'Open5e',itemType:'loot'};
const inventory=generate('shop',{seed:'remote',category:'blacksmith',count:40,maxRarity:4},[original]);assert(inventory.entries.some(x=>x.name==='Online Sword'&&x.generatedShopPrice===true));
const item=mapOpen5eItem({name:'Flame Ring',desc:'<b>Magic</b> ring',rarity:{name:'Rare'},category:{name:'Ring'},document:{display_name:'SRD'}},true);
assert.equal(item.priceGP,4000);assert.equal(item.category,'arcanist');assert.equal(item.itemType,'loot');
let seenUrl='';globalThis.fetch=async(url)=>{seenUrl=String(url);return {ok:true,json:async()=>({results:[{name:'Sword of Stars',rarity:{name:'Uncommon'},category:{name:'Weapon'},desc:'Test description'}]})};};
const online=await sourceItems('open5e-magic','sword');assert.equal(online.length,1);assert.match(seenUrl,/magicitems/);assert.match(seenUrl,/name__icontains=sword/);
const prepared=await resolveItem(item,2);assert.equal(prepared.system.quantity,2);assert.equal(prepared.type,'loot');
const app=new LootApp();app.result=generate('loot',{seed:'test',count:2});await app.prepareDrags();assert.equal(app.dragItems.length,app.result.entries.length);
let dragged='';app.element={contains:()=>true,querySelectorAll:()=>[]};app._onRender();app.element.ondragstart({target:{closest:()=>({dataset:{index:'0'}})},dataTransfer:{setData:(type,data)=>{assert.equal(type,'text/plain');dragged=data;}}});
assert.equal(JSON.parse(dragged).type,'Item');assert.equal(JSON.parse(dragged).data.name,app.result.entries[0].name);
assert.ok(open());cfg.user.isGM=false;assert.equal(open(),undefined);
console.log('Loot Generator v0.2.1 mocked tests passed.');
