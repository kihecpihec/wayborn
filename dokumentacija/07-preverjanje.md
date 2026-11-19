# Zapis začetnega preverjanja

Preverjeno pri pripravi mejnika (19. 11. 2026), lokalno na Linux z Node 24.22.2:

| Preverjanje | Rezultat |
| --- | --- |
| Obvezne datoteke in relativne povezave dokumentacije | Uspeh, `python scripts/check_docs.py` |
| TypeScript dema | Uspeh, `npm run typecheck` |
| ESLint dema | Uspeh, `npm run lint` |
| Obstoječi testi zemljevida in odprave | 30/30 uspešnih, `npm test` |
| Spletni izvoz dema | Uspeh, `npm run build:web` |
| Mockupi, širina 360 in 760 px | HTML predogled brez konzolnih napak |
| Tok mockupov v brskalniku | Obvezna polja prijave; prijava → zemljevid → odprava → premor → nadaljevanje → preklic zaključka → potrditev zaključka → povzetek → ozemlje → profil: uspeh |
| GitHub Issues | 9 objavljenih nalog z dodeljeno osebo in prioriteto v naslovu |

CI uporablja Node 22 in enake ukaze. Končni dokaz izvajanja workflowa je GitHub Actions run, povezan z objavljenim commitom; lokalni rezultati ga ne nadomestijo.

Nismo preverili fizičnih naprav, vedenja v ozadju, terenskega GPS ali bodočega zaledja. Mockupi uporabljajo shematski zemljevid in vzorčne podatke; pri preverjanju ne potrebujejo GPS. Demo ostaja ločen tehnični prototip. Arhitektura in geografski pragovi so načrt za implementacijo.
