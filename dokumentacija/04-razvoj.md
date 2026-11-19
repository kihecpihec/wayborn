# Organizacija dela in razvojni načrt

## Ekipa

| Član | GitHub | Primarna odgovornost | Pregled |
| --- | --- | --- | --- |
| Ismar Mujezinović | ismarM | Zemljevid, GPS, geografska pravila in CI | Hanan pregleda spremembe |
| Hanan Mešič | kihecpihec | Zasloni, profil, lokalna hramba, Supabase in sinhronizacija | Ismar pregleda spremembe |

To je predlagana razdelitev za začetni načrt; člana jo potrdita v Issues. Oba sodelujeta pri dokumentaciji, integraciji in terenskih testih. Asistentov račun še ni znan. Oba člana že imata dostop do repozitorija.

## Relativni načrt

Datume pretvorimo v koledarske po potrditvi roka predmeta. Spodaj so razvojni tedni po sprejetju zasnove.

| Faza | Obseg | Nosilec | Pogoj zaključka |
| --- | --- | --- | --- |
| M0 – zasnova | Dokumentacija, mockupi, Issues, CI | Oba | Dokumentacija v GitHub, dodeljene naloge, zelen Actions, dostop asistenta |
| Teden 1 | Ogrodje aplikacije, navigacija, račun, potrditev H3 | Hanan + Ismar | Prijava na napravi in potrjeni geografski parametri |
| Teden 2 | GPS odprave, segmenti, SQLite, trajno odkritje | Ismar + Hanan | Ponovni zagon ohrani napredek; premor ne odkriva |
| Teden 3 | Strežniška pravila, osvajanje in delni prevzem | Ismar | Majhna/velika zanka, samopresekanje, delni in sočasni prevzem preverjeni |
| Teden 4 | Sinhronizacija, XP, profil in integracija | Hanan | Brez dvojnega XP ob ponovitvi; zasebne trase |
| Teden 5 | Terenski testi, odprava napak, dokumentacija | Oba | Test na fizičnih napravah; prikaz brez povezave in slabega GPS |

P0 pomeni nujno za mejnik/MVP, P1 pomembno po osnovni integraciji, P2 nadgradnjo. Najprej rešujemo odvisnosti: geografska mreža pred trajnim odkrivanjem; lokalna hramba in validacija pred sinhronizacijo.

Za vsako spremembo: naloga → veja `feature/stevilka-opis` → implementacija → preverjanja → PR z `Closes #...` → pregled drugega člana → združitev. Dokončano pomeni izpolnjena merila, zelen CI in posodobljena navodila. Dogovor o pravilih zapisujemo v nalogo, ne le v pogovor.

## Glavna tveganja

Slab GPS: filtri in testne trase. Prevelike osvojitve: velikostne omejitve na strežniku. Sočasni prevzemi: transakcije. Nedosegljive ploščice: jasno stanje in predpomnilnik. Obseg: ekipe in dogodki ostanejo po MVP. Zasebnost: RLS in brez javnih tras. Neznan rok in račun asistenta: dopolniti pred oddajo.
