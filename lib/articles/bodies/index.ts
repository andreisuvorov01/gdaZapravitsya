import type { ArticleBlock } from "../types";
import * as guides from "./guides";
import * as fuel from "./fuel";
import * as geo from "./geo";
import * as about from "./about";
import * as seo from "./seo";
import * as conversion from "./conversion";

export const ARTICLE_BODIES: Record<string, ArticleBlock[]> = {
  "net-benzina-na-zapravke": guides.netBenzinaNaZapravke,
  "limit-na-zapravku": guides.limitNaZapravku,
  "kak-izbezhat-ocheredey": guides.kakIzbezhatOcheredey,
  "kak-polzovatsya-kartoy": guides.kakPolzovatsyaKartoy,
  "marshrut-s-zapravkami": guides.marshrutSZapravkami,
  "defitsit-topliva": guides.defitsitTopliva,
  "krowdsorsing-vs-oficial": guides.krowdsorsingVsOficial,
  "kak-ostavit-otchet": guides.kakOstavitOtchet,
  "gde-nayti-dizel": fuel.gdeNaytiDizel,
  "ai-92-ili-ai-95": fuel.ai92IliAi95,
  "sravnenie-setey-azs": fuel.sravnenieSeteyAzs,
  "zapravki-u-dorogi": fuel.zapravkiUDorogi,
  "gazomotornoe-toplivo": fuel.gazomotornoeToplivo,
  "benzin-v-moskve": geo.benzinVMoskve,
  "zapravki-na-trasse-m4": geo.zapravkiNaTrasseM4,
  "benzryadom-vs-gdebenz": about.benzryadomVsGdebenz,
  "kak-schitaetsya-status": about.kakSchitaetsyaStatus,
  "besplatnyy-servis": about.besplatnyyServis,
  "gde-benzin-segodnya": seo.gdeBenzinSegodnyaHub,
  "karta-benzina": seo.kartaBenzina,
  "prilozhenie-gde-benzin": seo.prilozhenieGdeBenzin,
  "gde-zapravit-i-kupit-benzin": seo.gdeZapravitIKupitBenzin,
  "nalichie-benzina-na-zapravkah": seo.nalichieBenzinaNaZapravkah,
  "pochemu-net-benzina": seo.pochemuNetBenzina,
  "situatsiya-s-benzinom": seo.situatsiyaSBenzinom,
  "kogda-poyavitsya-benzin": seo.kogdaPoyavitsyaBenzin,
  "tseny-na-benzin-segodnya": seo.tsenyNaBenzinSegodnya,
  "benzin-ai-92-segodnya": seo.benzinAi92Segodnya,
  "benzin-v-ekaterinburge": seo.benzinVEkaterinburge,
  "benzin-v-samare": seo.benzinVSamare,
  "benzin-v-saratove": seo.benzinVSaratove,
  "benzin-v-simferopole-i-krymu": seo.benzinVSimferopoleIKrymu,
  "benzin-v-oblasti": seo.benzinVOblasti,
  "benzin-v-novgorode": seo.benzinVNovgorode,
  "benzin-v-krasnodarskom-krae": seo.benzinVKrasnodarskomKrae,
  "v-kakoe-vremya-privozyat-benzin": seo.vKakoeVremyaPrivozyatBenzin,
  "kogda-privozyat-benzin-na-zapravki": seo.kogdaPrivozyatBenzinNaZapravki,
  "karta-azs": seo.kartaAzs,
  "azs-gazpromneft-na-karte-rossii": seo.azsGazpromneftNaKarteRossii,
  "set-azs-opti": seo.setAzsOpti,
  "protivorechivye-dannye-na-karte": conversion.protivorechivyeDannyeNaKarte,
  "izbrannoe-zapravki": conversion.izbrannoeZapravki,
  "pyat-oshibok-pri-poiske-benzina": conversion.pyatOshibokPriPoiskeBenzina,
  "tablo-est-karta-net": conversion.tabloEstKartaNet,
  "sluhi-v-chatah-vs-karta": conversion.sluhiVChatahVsKarta,
  "benzin-konchilsya-na-trasse": conversion.benzinKonchilsyaNaTrasse,
  "chek-list-dalnyaya-poezdka": conversion.chekListDalnyayaPoezdka,
  "ai-95-v-manual": conversion.ai95VManual,
  "podtverdit-zachem-knopka": conversion.podtverditZachemKnopka,
  "nalichie-ochered-limit": conversion.nalichieOcheredLimit,
  "karta-i-zdravyy-smysl": conversion.kartaIZdravyySmysl,
  "odna-set-pusto-sosednyaya-ochered": conversion.odnaSetPustoSosednyayaOchered,
};

export function getArticleBody(slug: string): ArticleBlock[] | undefined {
  return ARTICLE_BODIES[slug];
}
