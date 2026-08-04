// Sonde : le son part-il vraiment ?
//
// La preuve retenue n'est pas « un bouton son existe » mais le nombre
// d'oscillateurs Web Audio réellement créés — c'est objectif, et ça ne ment pas.
import { chromium, URL_JEU, ck, titre, bilan, SAVE } from './_socle.mjs'

const save = (o = {}) => SAVE({ soundOn: true, volume: 0.5, counts: { paysan: 20, soldat: 0, chevalier: 0, champion: 0 }, ...o })
const b=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']})
async function boot(st,vp={width:1280,height:900}){
  const ctx=await b.newContext({viewport:vp})
  await ctx.addInitScript(([k,v])=>localStorage.setItem(k,v),['croisade.save',JSON.stringify(st)])
  const p=await ctx.newPage();const e=[]
  p.on('pageerror',x=>e.push(String(x)))
  p.on('console',m=>{if(m.type()==='error'&&!(m.location()?.url??'').endsWith('/favicon.ico'))e.push(m.text())})
  // On espionne Web Audio : compter les oscillateurs créés est la seule preuve
  // objective qu'un son part réellement.
  await p.addInitScript(() => {
    window.__osc = 0
    const O = window.AudioContext || window.webkitAudioContext
    if (!O) return
    const orig = O.prototype.createOscillator
    O.prototype.createOscillator = function () { window.__osc++; return orig.call(this) }
  })
  await p.goto(URL_JEU,{waitUntil:'domcontentloaded'});await p.waitForSelector('.game')
  await p.waitForTimeout(500)
  return {ctx,p,e}
}
const osc=p=>p.evaluate(()=>window.__osc??0)

titre('1. Frapper produit un son')
{
  const {ctx,p,e}=await boot(save())
  const avant=await osc(p)
  for(let i=0;i<5;i++){ await p.click('.enemy-sprite',{force:true}); await p.waitForTimeout(90) }
  const apres=await osc(p)
  ck('des oscillateurs sont créés', apres>avant, `${avant} → ${apres}`)
  ck('un son par clic environ', apres-avant>=5, `${apres-avant} sons pour 5 clics`)
  ck('aucune erreur console', e.length===0, e.slice(0,2).join(' | '))
  await ctx.close()
}
titre('2. Couper le son coupe vraiment')
{
  const {ctx,p,e}=await boot(save({soundOn:false}))
  const avant=await osc(p)
  for(let i=0;i<5;i++){ await p.click('.enemy-sprite',{force:true}); await p.waitForTimeout(90) }
  ck('aucun son quand c est coupé', (await osc(p))===avant, `${avant} → ${await osc(p)}`)
  ck('aucune erreur console', e.length===0, e.slice(0,2).join(' | '))
  await ctx.close()
}
titre('3. Volume à zéro = silence')
{
  const {ctx,p}=await boot(save({volume:0}))
  const avant=await osc(p)
  for(let i=0;i<4;i++){ await p.click('.enemy-sprite',{force:true}); await p.waitForTimeout(90) }
  ck('silence à volume nul', (await osc(p))===avant)
  await ctx.close()
}
titre('4. Les réglages existent, s entendent, et persistent')
{
  const {ctx,p,e}=await boot(save())
  await p.click('.header-btn:has-text("Réglages")')
  await p.waitForSelector('.settings-ligne',{timeout:3000})
  ck('un interrupteur de son', await p.isVisible('.settings-ligne input[type=checkbox]'))
  ck('un curseur de volume', await p.isVisible('.settings-ligne input[type=range]'))
  const avant=await osc(p)
  await p.fill('.settings-ligne input[type=range]','0.3')
  await p.waitForTimeout(300)
  ck('régler donne un aperçu sonore', (await osc(p))>avant)
  await p.uncheck('.settings-ligne input[type=checkbox]')
  await p.waitForTimeout(400)
  const st=await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('croisade.save'));return {on:s.soundOn,v:s.volume}})
  ck('le réglage est persisté', st.on===false && Math.abs(st.v-0.3)<0.01, JSON.stringify(st))
  ck('le curseur se grise quand le son est coupé', await p.isVisible('.settings-ligne.muet'))
  ck('aucune erreur console', e.length===0, e.slice(0,2).join(' | '))
  await ctx.close()
}
titre('5. Mobile')
{
  const m=await boot(save(),{width:375,height:780})
  await m.p.click('.header-btn:has-text("Réglages")')
  await m.p.waitForSelector('.settings-ligne',{timeout:3000}); await m.p.waitForTimeout(200)
  const v=await m.p.evaluate(()=>({s:document.documentElement.scrollWidth,i:window.innerWidth}))
  ck('375 px : zéro débordement', v.s<=v.i, `${v.s} ≤ ${v.i}`)
  const petit=await m.p.evaluate(()=>[...document.querySelectorAll('.settings-ligne')]
    .filter(e=>e.getBoundingClientRect().height<38).length)
  ck('les réglages restent tapables', petit===0, `${petit} trop petits`)
  await m.ctx.close()
}
await b.close()
bilan()
