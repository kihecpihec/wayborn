# Primeri uporabe in navigacija

Wayborn igralcu omogoča, da med hojo odkriva dele resničnega sveta na pixel-art zemljevidu. Po koncu odprave pregleda odkritja, predvideno osvajanje in XP. Lokacijska storitev daje aplikaciji podatke med odpravo. Strežnik potrdi lastništvo in nagrade, ko je naprava povezana.

## Diagram primerov uporabe

![Popravljeni diagram](diagrami/primeri-uporabe.svg)

[Prenesi PNG](diagrami/primeri-uporabe.png) · [Izvor DOT](diagrami/primeri-uporabe.dot)

```mermaid
flowchart LR
    I["Igralec"]
    L["Lokacijska storitev naprave"]
    S["Zaledje Wayborn"]
    subgraph W["Mobilna aplikacija Wayborn"]
        UC1(["UC1 · Vstopi v igro"])
        UC2(["UC2 · Začni odpravo"])
        UC3(["UC3 · Hodi in razkrivaj zemljevid"])
        UC4(["UC4 · Upravljaj in zaključi odpravo"])
        UC5(["UC5 · Preglej predvideno osvajanje"])
        UC6(["UC6 · Sinhroniziraj odpravo"])
        UC7(["UC7 · Preglej profil in XP"])
        UC8(["UC8 · Kozmetika · po MVP"])
        UC9(["UC9 · Izzivi in dosežki · po MVP"])
        UC10(["UC10 · Ekipe · po MVP"])
    end
    I --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7
    L --- UC2 & UC3
    S --- UC1 & UC6
    I --- UC8
    I --- UC9
    I --- UC10
```

## Ključni scenariji

| Primer | Predpogoj in običajni potek | Odstopanje in pričakovani rezultat |
| --- | --- | --- |
| **UC1 · Vstop v igro** | Nov igralec se prijavi ali ustvari račun. Po vstopu se odpre zemljevid. V mockupu vstopi kot vzorčni igralec. | Napačni podatki ali nedosegljivo zaledje zadržijo igralca na prijavi. Mockup izvede uspešen vzorčni vstop. |
| **UC2 · Začetek odprave** | Igralec na zemljevidu izbere **Začni odpravo**. Ob prvem zagonu dovoli lokacijo med uporabo. Po veljavnem popravku se prikaže položaj. | Po zavrnitvi lahko še gleda zemljevid. Beleženje se začne šele, ko omogoči dovoljenje. |
| **UC3 · Hoja in odkrivanje** | Veljavni GPS odseki posodobijo razdaljo, čas, oceno korakov in sled. Megla se umika z obiskanih celic. Kontroli **Pixel/Karta** in **Sredi na igralca** upravljata prikaz zemljevida. | Slab signal ustavi beleženje nove razdalje in odkritij. Premik pogleda ne premakne igralca in ne ustvari XP. |
| **UC4 · Premor in zaključek** | Igralec začasno ustavi odpravo v zgornji vrstici. Ob nadaljevanju začne nov segment in obdrži dosežene vrednosti. Po potrditvi zaključka vidi povzetek. | Med premorom se napredek ne beleži. Vrnitev s potrditvenega zaslona ohrani odpravo. |
| **UC5 · Osvajanje** | Povzetek ob primerni trasi ponudi predogled. Veljavna majhna zanka zajame pot in notranjost. Če se dve zajeti celici prekrivata s tujim ozemljem, se ob potrditvi preneseta le ti dve. | Velik obhod zajame pas ob poti. Ozemlje pod meglo ostane skrito, preostanek tujega ozemlja ohrani lastnika. |
| **UC6 · Sinhronizacija** | Zaključena odprava počaka v lokalni vrsti. Po povezavi strežnik preveri traso ter potrdi lastništvo in XP. | Brez povezave povzetek kaže čakajoče stanje. Ponovno pošiljanje iste odprave ne podvoji XP. |
| **UC7 · Profil in XP** | Igralec odpre profil iz zemljevida ali potrjenega povzetka. Vidi stopnjo in potrjeno napredovanje. | Čakajoča nagrada je vidna v povzetku. V profil se prišteje po potrditvi. |

## Predvidena navigacija

![Popravljeni diagram](diagrami/navigacija.svg)

[Prenesi PNG](diagrami/navigacija.png) · [Izvor DOT](diagrami/navigacija.dot)

```mermaid
flowchart TD
    A["Vstop"] --> M["Zemljevid"]
    M -->|"Začni · dovoljenje še manjka"| G["Dovoljenje GPS"]
    G -->|"Zavrni · vrnitev"| M
    G -->|"Dovoli"| V["Čakanje na veljaven GPS"]
    M -->|"Začni · GPS dovoljen"| V
    V -->|"Veljaven položaj"| W["Aktivna odprava"]
    V -->|"Prekliči"| M
    W -->|"Premor"| P["Premor"]
    P -->|"Nadaljuj · nov segment"| V
    W --> E["Potrditev zaključka"]
    P --> E
    E -->|"Prekliči · prej aktivna"| W
    E -->|"Prekliči · prej premor"| P
    E -->|"Potrdi"| R["Povzetek · čaka na sinhronizacijo"]
    R <-->|"Izbirni predogled / Nazaj"| T["Predogled osvajanja"]
    R -->|"Vrni se · odprava ostane v vrsti"| M
    R -->|"Povezava in veljavna seja"| S["Strežniško preverjanje"]
    S -->|"Omrežna napaka · ponovi pozneje"| R
    S -->|"Sprejeto"| C["Potrjeni rezultat"]
    S -->|"Zavrnjeno"| X["Razlog zavrnitve · brez nagrade"]
    X --> M
    C --> M
    C --> F["Profil"]
    M <--> F
    M <--> J["Journal · izzivi in dosežki · po MVP"]
    M <--> K["Guilds · ekipe · po MVP"]
    F <--> H["Kozmetika · po MVP"]
    M <-->|"Preglej / Nazaj"| O["Potrjeno ozemlje"]
```

## Klikabilni prototip

### Pravila popravljenega toka

Predogled osvajanja je izbiren. Sinhronizacija lokalne vrste poteka tudi po vrnitvi na zemljevid, ko sta na voljo povezava in veljavna prijavna seja. Strežnik potrdi lastništvo in XP. Rezultat lahko vsebuje nič osvojenih celic. Ob poteku seje odprava ostane shranjena do ponovne prijave.

Dovoljenje GPS še ne zagotavlja uporabnega položaja. Ob slabem signalu ali prehodu v ozadje se beleženje prekine. Ob obnovi signala in nadaljevanju iz premora se začne nov segment z ohranjenimi statistikami. Prekinjenih segmentov ne povezujemo v osvojitveno zanko. Preklic zaključka povrne predhodno aktivno ali ustavljeno stanje.

### Pripombe k priloženima slikama in HTML V2

Zgornja diagrama in slikovna izvoza v mapi diagrami predstavljajo popravljeni načrt. Izvorni datoteki DOT omogočata ponovni izvoz z Graphviz.

- V diagramu primerov uporabe uporabimo polne povezave med igralcem in primeri uporabe. Zaledje sodeluje pri prijavi in sinhronizaciji. Zaporedje korakov prikazuje navigacijski diagram.
- Hero vsebuje profil in XP v MVP. Kozmetika, Journal in Guilds so nadgradnje po MVP.
- V navigaciji dodamo Territory, povratne povezave, čakanje na GPS, izbirni predogled in neuspešno sinhronizacijo.
- HTML V2 potrebuje zaslone oziroma stanja za vstop, dovoljenje GPS, premor, potrditev zaključka, povzetek in čakajočo oziroma zavrnjeno sinhronizacijo. Demonstracijski gumb za osvojitev v izvedbi počaka na strežniško potrditev.
- Simulacija V2 oglašuje korak 150 m, koda pa prišteje 170 m. Razdalja, XP na zemljevidu in napredek profila morajo izhajati iz skupnega stanja odprave.

### Obstoječi prototip MVP

Odpri [index.html](mockupi/index.html) iz lokalne kopije repozitorija. Prototip je v slovenščini in deluje brez povezave. Štirje gumbi ob telefonu nastavijo vzorčne podatke za prvi obisk, hojo, osvajanje in sinhronizacijo. GPS, prijava, napredek in odgovor zaledja so simulirani. Ponastavitev scenarija povrne njegove začetne podatke.

- [Wayborn Demo 01](https://github.com/kihecpihec/wayborn-demo1/tree/5f02aa160005eb4b9ff06d667f046f95acdbd65e) je izhodišče za lokacijski HUD, gumba Pixel/Karta in centriranje ter ploščo odprave s segmentnim XP. Podlaga mockupa je izrez posnetka zemljevida pri povečavi 18. Preklop na navadno karto je stiliziran prikaz.
- [Wayborn landing](https://github.com/kihecpihec/wayborn-landing/tree/2c13b42) je izhodišče za videz vstopa, paleto in zamisel o postopnem razkrivanju pixel-art sveta. Osvajanje, sinhronizacija in trajni profil izhajajo iz [projektne zasnove](01-projekt.md).

### Pot skozi prototip za pregled

1. **Prvi obisk.** Vstopi, začni odpravo, zavrni GPS, vrni se na zemljevid in ob ponovnem začetku omogoči dovoljenje.
2. **Hoja.** Simuliraj odsek in opazuj meglo, čas in XP. Preveri, da premor in slab GPS ustavita napredek. Nato nadaljuj. Na zaslonu za zaključek lahko izbereš vrnitev na odpravo.
3. **Osvajanje.** Zaključi pripravljeno vzorčno pot in v povzetku primerjaj majhno zanko z velikim obhodom. Odpri predogled celic za oba primera.
4. **Sinhronizacija.** Preveri čakajoči povzetek, simuliraj ponovno povezavo in sinhroniziraj odpravo. Po ponovnem pošiljanju preveri, da se v profilu XP prišteje enkrat.
