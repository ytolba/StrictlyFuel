/**
 * Citations for the guidance StrictlyFuel shows.
 *
 * App Review guideline 1.4.1 requires health and nutrition recommendations to
 * cite their sources somewhere the athlete can find them, so every screen that
 * shows a target links the research it is built on.
 */
export type ResearchSource = { title: string; detail: string; url: string };

export const FUEL_TARGET_SOURCES: ResearchSource[] = [
  { title: "Carbohydrates for training and competition", detail: "Burke, Hawley, Wong & Jeukendrup, Journal of Sports Sciences", url: "https://doi.org/10.1080/02640414.2011.585473" },
  { title: "World Athletics nutrition consensus", detail: "Consensus statements on nutrition for athletics", url: "https://worldathletics.org/about-iaaf/documents/health-science" },
  { title: "ISSN position stand: nutrient timing", detail: "Kerksick et al., Journal of the International Society of Sports Nutrition", url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0189-4" },
  { title: "ISSN position stand: the female athlete", detail: "Sims et al., nutritional concerns of the female athlete", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10210857/" },
];

export const RECOVERY_SOURCES: ResearchSource[] = [
  { title: "ISSN position stand: nutrient timing", detail: "Carbohydrate and protein after exercise", url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0189-4" },
  { title: "Carbohydrates for training and competition", detail: "Daily and post-exercise carbohydrate targets", url: "https://doi.org/10.1080/02640414.2011.585473" },
  { title: "ISSN position stand: the female athlete", detail: "Recovery considerations for female athletes", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10210857/" },
];
