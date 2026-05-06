# Sprites — Prompts Nano Banana (recette validée)

## Recette

À chaque génération :
1. **Joindre une image de référence** = le sprite **Soldat** (canon du style chibi)
   - exception : pour le Soldat lui-même, le Paysan v3 (tunique cream, fond magenta) sert de seed initial
2. **Fond magenta solide `#FF00FF`** (Gemini ne fait pas de vraie transparence)
3. **Suffixe anti-watermark** : `no signature, no watermark, no logo`
4. **Format** : 1024×1024 pour les unités, 1024×512 pour les décors
5. **Orientation** : alliés en `3/4 view facing right`, ennemis en `3/4 view facing LEFT`
6. **Style chibi marqué** : tête ~30% du corps, contours noirs épais
7. Dépose le PNG en `assets/sprites/<nom>_raw.png`
8. Lance `python scripts/chroma_key.py --batch assets/sprites/` → produit `<nom>.png` propre

## Art Bible

- Pixel art 16-bit, esprit Octopath Traveler / Stardew Valley combat
- Palette dark fantasy saturée mais lisible
- Lumière top-left
- Cadrage centré, marges minimales
- Posture idle de combat (statique, animations en CSS)

---

## 1. Paysan — `paysan_raw.png` (référence : Soldat)

```
Pixel art 16-bit sprite, single medieval peasant warrior, 3/4 view facing right,
body and head turned slightly to the right, holding a wooden pitchfork pointed
forward in idle combat stance, off-white cream linen tunic (NOT brown, light
beige color), brown leather belt, brown trousers, worn leather boots, dirty
determined face with tousled brown hair, character ~70% of canvas height,
SOLID FLAT MAGENTA BACKGROUND (#FF00FF, pure RGB 255 0 255, fill the entire
background, no checkerboard, no gradient, no transparency indicator), centered
composition, dark fantasy palette, top-left lighting, no text, no UI, no ground
shadow, no signature, no watermark, no logo, 1024x1024, clean alpha edges,
EXACT SAME ART STYLE as the reference image (the soldier sprite): same chibi
proportions head ~30% of body, same thick black contour line weight, same
palette family, same character design energy
```

## 2. Soldat — `soldat_raw.png` (référence : Paysan v3)

```
Pixel art 16-bit sprite, single medieval foot soldier, 3/4 view facing right,
body and head turned slightly to the right, holding a short steel sword in right
hand and a round wooden shield with iron rim in left hand, chainmail hauberk
over a red tunic, iron nasal helmet with chainmail coif, leather greaves and
worn boots, determined expression, character ~70% of canvas height,
SOLID FLAT MAGENTA BACKGROUND (#FF00FF, pure RGB 255 0 255, fill the entire
background, no checkerboard, no gradient), centered composition, dark fantasy
palette, top-left lighting, no text, no UI, no ground shadow, no signature,
no watermark, no logo, 1024x1024, clean alpha edges,
EXACT SAME ART STYLE as the reference image: same chibi proportions head ~30%
of body, same thick black contour line weight, same palette family
```

## 3. Chevalier — `chevalier_raw.png` (référence : Soldat)

```
Pixel art 16-bit sprite, single medieval armored knight on foot, 3/4 view
facing right, body and head turned slightly to the right, holding a longsword
pointed up over right shoulder, full plate armor with engraved details, deep
red surcoat with white heraldic cross emblem on chest, great helm with visor
down, iron gauntlets and sabatons, character ~75% of canvas height,
SOLID FLAT MAGENTA BACKGROUND (#FF00FF, pure RGB 255 0 255, fill the entire
background, no checkerboard, no gradient), centered composition, dark fantasy
palette with metallic silver / crimson red / steel blue accents, top-left
lighting, no text, no UI, no ground shadow, no signature, no watermark,
no logo, 1024x1024, clean alpha edges,
EXACT SAME ART STYLE as the reference image (the soldier sprite): same chibi
proportions head ~30% of body, same thick black contour line weight, same
palette family, same character design energy
```

## 4. Champion — `champion_raw.png` (référence : Soldat)

```
Pixel art 16-bit sprite, single legendary medieval champion warrior, 3/4 view
facing right, body and head turned slightly to the right, holding a massive
two-handed greatsword resting on right shoulder, ornate gold-trimmed black
plate armor with intricate engravings, long flowing crimson red cape behind,
golden crown circlet on great helm with visor up showing a fierce shadowed
face, character ~80% of canvas height, SOLID FLAT MAGENTA BACKGROUND (#FF00FF,
pure RGB 255 0 255, fill the entire background, no checkerboard, no gradient),
centered composition, dark fantasy palette with regal gold / obsidian black /
crimson, dramatic top-left lighting with subtle rim light on the armor,
no text, no UI, no ground shadow, no signature, no watermark, no logo,
1024x1024, clean alpha edges,
EXACT SAME ART STYLE as the reference image (the soldier sprite): same chibi
proportions head ~30% of body, same thick black contour line weight, same
palette family, same character design energy
```

## 5. Gobelin Maraudeur — `gobelin_raw.png` (référence : Soldat) — **facing LEFT**

```
Pixel art 16-bit sprite, single goblin marauder, 3/4 view FACING LEFT (the
opposite direction of the reference soldier), body and head turned slightly
to the left, hunched aggressive posture, mossy green skin, big pointed ears,
sharp yellow teeth visible in a snarl, holding a rusty crooked dagger in right
hand and a small battered wooden buckler in left hand, ragged dirty leather
scraps as armor, bone necklace, scrappy loincloth, character ~55% of canvas
height (smaller than human troops), SOLID FLAT MAGENTA BACKGROUND (#FF00FF,
pure RGB 255 0 255, fill the entire background, no checkerboard, no gradient),
centered composition, dark fantasy palette with mossy green / dirty brown /
rust, top-left lighting, no text, no UI, no ground shadow, no signature,
no watermark, no logo, 1024x1024, clean alpha edges,
EXACT SAME ART STYLE as the reference image (the soldier sprite): same chibi
proportions head ~30% of body, same thick black contour line weight, same
palette family, same pixel art rendering style
```

## 6. Forêt Sombre (background) — `foret_raw.png` (référence : Soldat)

> ⚠️ Pour les décors : **ne pas utiliser le batch `chroma_key.py`** tel quel
> — il efface un coin de 200×200 px qui sera visible. À retoucher manuellement
> ou à régénérer en cropping la watermark hors du cadre.

```
Pixel art 16-bit landscape background, dark medieval forest at twilight,
dense black silhouetted gnarled trees, pale crescent moonlight filtering
through grey-blue fog, dirt forest path running across the lower third,
fireflies and atmospheric mist, no characters, no text, ominous mood, dark
blue-purple-charcoal palette with slight teal moonlight highlights,
1024x512 horizontal landscape, lower third left clear for combat sprites,
no signature, no watermark, no logo,
SAME ART STYLE FAMILY as the reference soldier sprite: same pixel grain,
same black outline philosophy on key elements, same color palette tone
```

---

## Pipeline

```bash
# Une fois tous les *_raw.png déposés :
python scripts/chroma_key.py --batch assets/sprites/

# Pour un sprite seul :
python scripts/chroma_key.py assets/sprites/<nom>_raw.png assets/sprites/<nom>.png
```

Le script :
- Retire le fond magenta (tolérance ±60 sur RGB)
- Efface un coin 200×200 px en bas-droite (watermark Gemini)
- Sort un PNG avec vrai canal alpha
