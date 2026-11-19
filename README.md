# Wayborn — Your World, Your Adventure

Mobilna raziskovalna RPG igra, ki gibanje po resničnem svetu pretvarja v odkrivanje pixel-art zemljevida in osvajanje ozemelj.

**Ekipa:** Ismar Mujezinović ([@ismarM](https://github.com/ismarM)), Hanan Mešič ([@kihecpihec](https://github.com/kihecpihec)).

## Projektni mejnik

- [Projektna zasnova in obseg](dokumentacija/01-projekt.md)
- [Uporabniški scenariji in navigacija](dokumentacija/02-scenariji.md)
- [Klikabilni mockupi](dokumentacija/mockupi/index.html) — prenesi repozitorij in odpri HTML v brskalniku; GitHub HTML prikazuje kot kodo.
- [Podatkovni model in arhitektura](dokumentacija/03-arhitektura.md)
- [Razvojni načrt in odgovornosti](dokumentacija/04-razvoj.md)
- [Kontrolni seznam oddaje](dokumentacija/05-oddaja.md)
- [Začetne naloge](dokumentacija/06-naloge.md)

## Struktura

`prototip/mapa/` vsebuje priloženi Expo demo zemljevida; `dokumentacija/` projektno dokumentacijo in ločen prototip zaslonov; `scripts/` preverjanje dokumentacije; `.github/` CI in predloge nalog.

## Zagon prototipa zemljevida

Node 22.13 ali novejši, npm:

```sh
cd prototip/mapa
npm ci
npm run web
```

Za telefon: `npm start` in združljiv Expo Go oziroma razvojna gradnja. Podrobnosti in omejitve so v [README dema](prototip/mapa/README.md). Zemljevid potrebuje internet. GPS v brskalniku potrebuje localhost ali HTTPS.

Demo je tehnični prototip zemljevida, GPS sledenja in začasnih statistik, ne končna igra. Ob ponovnem nalaganju se napredek izgubi. Fog of war, osvajanje, računi, trajna hramba in ekipe še niso izvedeni. Klikabilni mockupi prikazujejo načrtovane funkcije z vzorčnimi podatki.

## Preverjanje

```sh
python3 scripts/check_docs.py
cd prototip/mapa
npm ci
npm run typecheck
npm run lint
npm test
npm run build:web
```

Workflow `Začetna preverjanja` teče ob pushu in pull requestu. Izvoz spletne različice preveri prevajanje; dovoljenja in GPS na fizični napravi preverimo ročno.

## Sodelovanje

Naloge vodimo v GitHub Issues s prioriteto P0/P1/P2 in odgovornim članom. Spremembe potekajo v vejah prek pull requestov, ki jih pregleda drugi član. Rok tega mejnika še ni potrjen; datum 11. 11. 2026 v izhodiščni ideji se nanaša na prvo oddajo. Asistentov GitHub račun je treba še pridobiti in mu omogočiti dostop.
