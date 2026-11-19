# Projektna zasnova

## Namen in uporabniki

Wayborn spodbuja študente, mlade in ljubitelje RPG iger k rednemu gibanju. Resnične ulice in poti spremeni v fantazijski pixel-art svet. Igralec vodi lik, raziskuje okolico, pridobiva XP in tekmuje za ozemlja. Osnovna zanka je: začni odpravo → premikaj se → odkrij celice → osvoji veljavno območje → prejmi nagrado → nadgradi lik.

## Prva različica (MVP)

| Funkcija | Predvideno vedenje | Trenutno stanje |
| --- | --- | --- |
| Račun in profil | Prijava, ime, lik, stopnja, XP | Mockup in model |
| GPS odprava | Začetek, premor, nadaljevanje, konec, razdalja in čas | Demo za hojo, začasno stanje |
| Pixel-art zemljevid | Resnična geografija, sledenje položaju | Delujoč demo |
| Fog of war | Trajno odkrivanje ob obisku, ločeno za vsakega igralca | Načrtovano |
| Osvajanje | Majhna zanka osvoji notranjost, velika samo pas ob poti | Načrtovano |
| Delni prevzem | Spremeni lastnika samo na veljavnih osvojenih celicah | Načrtovano |
| XP | Nagrada za novo raziskovanje, trajni napredek | Demo: 25 XP/celico in 500 XP/stopnjo, brez hrambe |
| Sinhronizacija | Lokalna hramba in potrjevanje na strežniku | Načrtovano |

Poznejše nadgradnje: vloge tekača in kolesarja, inventar in cosmetics, izzivi, dosežki, skrinje, ekipe, družabne funkcije in dogodki ponovnega osvajanja. Mockup profila vsebuje predogled kozmetike, ki ni zaveza za MVP.

## Predlog pravil za prototip

H3 mreža naj bo enotna za odkrivanje in lastništvo. Ločljivost in pragove izberemo po terenskem preizkusu; demo uporablja drugačno približno 40-metrsko mrežo, ki je ne smemo neposredno obravnavati kot H3.

Za začetni preizkus predlagamo zaključek zanke največ 25 m od začetka, vsaj 150 m opravljene poti, največ 1 ha notranjosti in največ 1 km obsega za osvajanje notranjosti. Večje ali odprte poti osvojijo le obiskane celice oziroma pas ob potrjeni trasi. To so predlagane vrednosti, ki jih mora ekipa potrditi. Pri nezanesljivi natančnosti GPS zanke ne zaključimo samodejno. Prekinitve, premori in skoki ne povezujejo nepovezanih segmentov v zanko. Samopresečne zanke v MVP zavrnemo za osvajanje notranjosti.

Strežnik ponovno izračuna upravičenost iz potrjene trase in pravil; odjemalec ne določa lastnika ali končnega XP. Prevzem spremeni lastništvo posameznih celic. Neodkritim celicam API ne vrača lastnikov. Dogodek v prihodnje ponastavi lastništvo, ne osebnega odkritja.

## Kakovost in omejitve

Aplikacija mora prikazati zavrnjeno dovoljenje, slab GPS, odsotnost interneta in čakajočo sinhronizacijo. MVP sledi samo v ospredju. Surove trase niso javne; drugi igralci ne vidijo trenutne natančne lokacije. Prikaz družabnih podatkov bo privolitven. Pred produkcijo določimo roke hrambe in postopek izbrisa računa. Zemljevid mora ohraniti pripis avtorstva ponudnikov.

Uspeh MVP: dve testni napravi ohranita odkritje po ponovnem zagonu, ista sinhronizirana odprava ne prinese dvojnega XP, manjša zanka in velik obhod dasta različna rezultata, delni prevzem ne spremeni preostanka tujega območja.
