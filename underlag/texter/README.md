# Texterna

Ett blad per text som Niclas Fohlin skrivit eller medverkat i, 66 stycken, hämtade ur sidornas egen HTML fram till 2026-09-10. Registret är `register.json`; `npm run texter` läser det.

| Fält i bladet | Betyder |
|---|---|
| titel | rubriken utan tidningens prefix som "Fohlin:" |
| publicerad_rubrik | rubriken som den stod |
| kalla | originalets adress. Posten på sajten länkar dit |
| datum, publikation, etikett | sidans datumfält, publikationens id i src/data/publikationer.json, tidningens egen etikett |
| typ | kronika, debatt, artikel eller intervju, alltså sajtens typ |
| forfattarskap, medforfattare, byline | författare, medförfattare eller intervjuad; bylinen som sidan visade den |
| ord | fulltextens längd. 0 betyder att bladet bara bär metadata |
| rattigheter | vad Niclas sagt om att lägga hela texten på sajten. Tills han sagt något: ej bekräftade |
| post | sajtens post när den finns |
| tidningens_ingress | tidningens egen ingress. Den används aldrig som sajtens ingress |

Fulltexten under frontmattern är textens brödtext. Tidningens utdragscitat, faktarutor om hur man skriver debattartiklar och länklistor är borttagna. Signaturraden i debattartiklar står kvar.

## Så blir ett blad en post

`/ny-artikel <slug>` läser bladet, skriver en egen ingress enligt STIL.md, väljer taggar ur registret och skapar `src/content/artiklar/<slug>.md` med `heltext: false`. `npm run texter --saknar-post` visar vilka som återstår. Hela texten kopieras in i posten först när Niclas sagt att rättigheterna medger det, och då sätts `heltext: true` och fältet rattigheter i bladet uppdateras.

## Per publikation

| vi-larare | 56 |
| goteborgs-posten | 1 |
| livslangt | 1 |
| altinget | 1 |
| ne | 1 |
| kooperativt | 2 |
| forskoleforum | 4 |

## Inte medtaget

Repliker och porträtt som andra skrivit om Niclas, samt en nyhetstext där han citeras (Hundra mil för en dyslexiutredning?, Vi Lärare 2025-05-09). Blogginlägg på kooperativt.com under kontot kooperativt, utan personlig byline. Böckerna står i `../bocker/register.json`, liksom en Aftonbladet-replik från tolv lärare (2025-11) där undertecknarna inte gick att läsa.

## Sökningen

Tre sökagenter (2026-09-19) med webbsök, Vi Lärares egen sökfunktion (129 träffar på Fohlin), hans författarsida där, en crawl av 1 275 krönike- och debattsidor ur sajtens sitemap, samt förlagets, Förskoleforums och bloggens författarsidor. Inga egna texter hittades i DN, SvD, Expressen, Skolvärlden, Läraren, Pedagogiska magasinet eller Skolporten (som återpublicerar Vi Lärare).
