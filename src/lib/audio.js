// Sons et SFX — synthétisés, jamais chargés.
//
// Dernier bloc de V4 jamais touché, et la Frappe (US 38) le réclamait : cliquer
// sans retour sonore, c'est plat.
//
// Deux contraintes du projet dictent la forme :
//   • « pas d'assets lourds » — donc AUCUN fichier audio. Tout est synthétisé
//     par Web Audio, à partir d'oscillateurs et d'enveloppes. Le catalogue
//     ci-dessous est une partition, pas une médiathèque ;
//   • zéro dépendance — Web Audio est natif.
//
// Le catalogue est une DONNÉE PURE, donc testable sans navigateur. Seul le
// lecteur touche à l'AudioContext, et il dégrade en silence quand il n'y en a
// pas (tests, navigateur récalcitrant, autoplay bloqué).

// `type` : forme d'onde · `from`/`to` : glissando en Hz · `dur` : secondes
// `gain` : volume relatif de l'effet · `noise` : bruit blanc plutôt qu'un ton.
export const SONS = {
  frappe:      { type: 'square',   from: 180, to: 90,   dur: 0.07, gain: 0.35 },
  critique:    { type: 'sawtooth', from: 620, to: 220,  dur: 0.16, gain: 0.5 },
  mobMort:     { type: 'triangle', from: 260, to: 120,  dur: 0.12, gain: 0.32 },
  bossMort:    { type: 'sawtooth', from: 150, to: 40,   dur: 0.55, gain: 0.6 },
  recrutement: { type: 'sine',     from: 440, to: 660,  dur: 0.09, gain: 0.28 },
  relique:     { type: 'sine',     from: 700, to: 1200, dur: 0.22, gain: 0.4 },
  legendaire:  { type: 'sine',     from: 500, to: 1800, dur: 0.6,  gain: 0.55 },
  succes:      { type: 'triangle', from: 800, to: 1100, dur: 0.25, gain: 0.4 },
  telegraphe:  { type: 'square',   from: 300, to: 300,  dur: 0.18, gain: 0.45 },
  faille:      { type: 'sawtooth', from: 900, to: 300,  dur: 0.3,  gain: 0.5 },
  prestige:    { type: 'sine',     from: 300, to: 900,  dur: 0.9,  gain: 0.6 },
}

export const SON_IDS = Object.keys(SONS)

export const VOLUME_DEFAUT = 0.5

export function clampVolume(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return VOLUME_DEFAUT
  return Math.min(1, Math.max(0, n))
}

// Un son ne part que si le son est activé, le volume audible, et l'effet connu.
// Centralisé ici pour que la règle soit testable sans navigateur.
export function doitJouer(id, { soundOn = true, volume = VOLUME_DEFAUT } = {}) {
  return !!SONS[id] && soundOn === true && clampVolume(volume) > 0
}

// Le son le plus fort du catalogue sert de référence : aucun effet ne doit
// pouvoir saturer, quel que soit le volume choisi.
export const GAIN_MAX = Math.max(...SON_IDS.map(id => SONS[id].gain))

// Lecteur. `ctxFactory` est injectable pour les tests ; en production on passe
// le constructeur natif. Renvoie toujours un objet utilisable — un navigateur
// sans Web Audio ne doit pas casser le jeu, juste rester muet.
export function creerLecteur(ctxFactory) {
  let ctx = null
  let muet = false

  function contexte() {
    if (muet) return null
    if (ctx) return ctx
    try {
      ctx = ctxFactory ? ctxFactory() : null
    } catch (_) {
      muet = true
      return null
    }
    if (!ctx) muet = true
    return ctx
  }

  return {
    // Les navigateurs interdisent le son avant un geste de l'utilisateur : on
    // réveille le contexte au premier clic plutôt qu'au chargement.
    reveiller() {
      const c = contexte()
      if (c && c.state === 'suspended' && typeof c.resume === 'function') c.resume()
    },
    jouer(id, reglages = {}) {
      if (!doitJouer(id, reglages)) return false
      const c = contexte()
      if (!c) return false
      try {
        const son = SONS[id]
        const t = c.currentTime
        const osc = c.createOscillator()
        const amp = c.createGain()
        osc.type = son.type
        osc.frequency.setValueAtTime(son.from, t)
        if (son.to !== son.from) osc.frequency.exponentialRampToValueAtTime(son.to, t + son.dur)
        // Attaque courte puis extinction : sans enveloppe, un oscillateur claque.
        const pic = son.gain * clampVolume(reglages.volume ?? VOLUME_DEFAUT)
        amp.gain.setValueAtTime(0.0001, t)
        amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, pic), t + 0.01)
        amp.gain.exponentialRampToValueAtTime(0.0001, t + son.dur)
        osc.connect(amp).connect(c.destination)
        osc.start(t)
        osc.stop(t + son.dur + 0.02)
        return true
      } catch (_) {
        return false
      }
    },
  }
}
