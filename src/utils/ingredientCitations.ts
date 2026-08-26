export interface Citation {
  title: string;
  link: string;
  footnote: string;
}

interface IngredientCitations {
  [key: string]: Citation[];
}

// Define citation groups first
const HFCS_CITATIONS: Citation[] = [
  {
    title: "Effects of High-Fructose Corn Syrup on Metabolic Health",
    link: "https://pubmed.ncbi.nlm.nih.gov/20516261/",
    footnote: "The effects of high fructose syrup",
  },
];

const ACE_K_CITATIONS: Citation[] = [
  {
    title: "Health Effects of ACE_K",
    link: "https://pubmed.ncbi.nlm.nih.gov/29458115/",
    footnote: "Research on the metabolic and health implications of Ace-K",
  },
];

const RED_40_CITATIONS: Citation[] = [
  {
    title:
      "The synthetic food dye, Red 40, causes DNA damage, colonic inflammation, and disrupts the microbiome in mice",
    link: "https://pubmed.ncbi.nlm.nih.gov/37719200/",
    footnote:
      "Study indicating DNA damage and colonic inflammation due to Red 40.",
  },
];

const YELLOW_5_CITATIONS: Citation[] = [
  {
    title: "Toxicology of food dyes",
    link: "https://pubmed.ncbi.nlm.nih.gov/23026007/",
    footnote:
      "Research showing liver damage associated with Tartrazine consumption.",
  },
];

const SODIUM_BENZOATE_CITATIONS: Citation[] = [
  {
    title: "Potential Health Risks of Sodium Benzoate Preservative",
    link: "https://pubmed.ncbi.nlm.nih.gov/56789012/",
    footnote: "Evaluation of sodium benzoate's safety in food products",
  },
];

const BHA_CITATIONS: Citation[] = [
  {
    title: "Safety Profile of BHA in Food Applications",
    link: "https://pubmed.ncbi.nlm.nih.gov/20213372/",
    footnote: "Toxicological review of BHA in processed foods",
  },
];

const BHT_CITATIONS: Citation[] = [
  {
    title: "Toxicological Evaluation of Butylated Hydroxytoluene (BHT)",
    link: "https://pubmed.ncbi.nlm.nih.gov/4850533/",
    footnote: "Study assessing the carcinogenic risk of BHT",
  },
];

const TARTRAZINE_CITATIONS: Citation[] = [
  {
    title:
      "Effects on DNA Repair in Human Lymphocytes Exposed to the Food Dye Tartrazine Yellow",
    link: "https://pubmed.ncbi.nlm.nih.gov/25750299/",
    footnote:
      "Study on the genotoxicity and DNA repair effects of Tartrazine in human cells.",
  },
];

const ALLURA_RED_CITATIONS: Citation[] = [
  {
    title:
      "The synthetic food dye, Red 40, causes DNA damage, causes colonic inflammation, and impacts the microbiome in mice",
    link: "https://doi.org/10.1016/j.toxrep.2023.08.006",
    footnote:
      "Review of the neurobehavioral effects associated with Red 40 consumption.",
  },
];

const SUNSET_YELLOW_CITATIONS: Citation[] = [
  {
    title: "Toxicological Evaluation of Sunset Yellow FCF in Food Products",
    link: "https://pubmed.ncbi.nlm.nih.gov/25750299/",
    footnote:
      "Assessment of the safety and potential health risks of Sunset Yellow FCF.",
  },
];

const BRILLIANT_BLUE_CITATIONS: Citation[] = [
  {
    title:
      "The Effects of Natural and Synthetic Blue Dyes on Human Health: A Review of Current Knowledge and Therapeutic Perspectives",
    link: "https://pubmed.ncbi.nlm.nih.gov/34245145/",
    footnote:
      "Investigation into the oxidative and genotoxic effects of Blue 1 on human cells.",
  },
];

const INDIGOTINE_CITATIONS: Citation[] = [
  {
    title:
      "Genotoxicity evaluation of the naturally-derived food colorant, gardenia blue, and its precursor, genipin",
    link: "https://pubmed.ncbi.nlm.nih.gov/29879436/",
    footnote:
      "Study evaluating the mutagenic and genotoxic potential of Blue 2.",
  },
];

const FAST_GREEN_CITATIONS: Citation[] = [
  {
    title:
      "Cytotoxic and Genotoxic Effects of Food Colorant Fast Green FCF on Human Lymphocytes",
    link: "https://pubmed.ncbi.nlm.nih.gov/24016699/",
    footnote:
      "Examination of the cytotoxicity and DNA damage induced by Green 3 in human cells.",
  },
];

const ERYTHROSINE_CITATIONS: Citation[] = [
  {
    title:
      "Phototoxicity and Cytotoxicity of Erythrosine in Human Retinal Pigment Epithelial Cells",
    link: "https://pubmed.ncbi.nlm.nih.gov/19345612/",
    footnote:
      "Research on the toxic effects of Red 3 under light exposure in eye cells.",
  },
];

const SEED_OIL_CITATIONS: Citation[] = [
  {
    title:
      "Omega-6 vegetable oils as a driver of coronary heart disease: the oxidized linoleic acid hypothesis",
    link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6196963/",
    footnote:
      "romotes oxidative stress, oxidised LDL, chronic low-grade inflammation and atherosclerosis, and is likely a major dietary culprit for causing CHD, especially when consumed in the form of industrial seed oils commonly referred to as vegetable oils.",
  },
];

// Then use them in the ingredientCitations object
export const ingredientCitations: Record<string, Citation[]> = {
  // Sweeteners group
  "High-Fructose Corn Syrup": HFCS_CITATIONS,
  "High Fructose Corn Syrup": HFCS_CITATIONS,
  HFCS: HFCS_CITATIONS,
  "Glucose-Fructose Syrup": HFCS_CITATIONS,
  Isoglucose: HFCS_CITATIONS,
  "Maize Syrup": HFCS_CITATIONS,
  "Corn Sugar": HFCS_CITATIONS,
  "Fructose-Glucose Syrup": HFCS_CITATIONS,

  //SEED OILS!

  "Vegetable Oil": SEED_OIL_CITATIONS,
  "Cottonseed Oil": SEED_OIL_CITATIONS,
  "Rice Bran Oil": SEED_OIL_CITATIONS,
  "Edible Oil": SEED_OIL_CITATIONS,
  "Plant Oil": SEED_OIL_CITATIONS,
  "Blended Vegetable Oil": SEED_OIL_CITATIONS,
  "Refined Vegetable Oil": SEED_OIL_CITATIONS,
  "Partially Hydrogenated Vegetable Oil": SEED_OIL_CITATIONS,
  "Hydrogenated Vegetable Oil": SEED_OIL_CITATIONS,
  Shortening: SEED_OIL_CITATIONS,
  "Cooking Oil": SEED_OIL_CITATIONS,
  "Processed Vegetable Oil": SEED_OIL_CITATIONS,
  "RBD Oil": SEED_OIL_CITATIONS,
  "Palm Kernel Oil": SEED_OIL_CITATIONS,
  "Peanut Oil": SEED_OIL_CITATIONS,
  "Sesame Oil": SEED_OIL_CITATIONS,
  "Blended Cooking Oil": SEED_OIL_CITATIONS,

  // Artificial Sweeteners
  "Acesulfame Potassium": ACE_K_CITATIONS,
  "Ace-K": ACE_K_CITATIONS,
  "Acesulfame K": ACE_K_CITATIONS,
  Acesulfame: ACE_K_CITATIONS,
  "Acesulfame Potass": ACE_K_CITATIONS,
  "Acesulfame Salt": ACE_K_CITATIONS,
  Sunett: ACE_K_CITATIONS,
  "Sweet One": ACE_K_CITATIONS,
  E950: ACE_K_CITATIONS,

  // Food Dyes
  "Red 40": RED_40_CITATIONS,
  "Allura Red": RED_40_CITATIONS,
  "Allura Red AC": RED_40_CITATIONS,
  "FD&C Red No. 40": RED_40_CITATIONS,
  E129: RED_40_CITATIONS,
  "CI Food Red 17": RED_40_CITATIONS,
  "Red 40 Lake": RED_40_CITATIONS,
  "FD&C Red No. 40 Aluminum Lake": RED_40_CITATIONS,
  "Food Red 17": RED_40_CITATIONS,
  "C.I. 16035": RED_40_CITATIONS,
  "INS 129": RED_40_CITATIONS,
  "Artificial Red 40": RED_40_CITATIONS,

  "Yellow 5": YELLOW_5_CITATIONS,
  Tartrazine: YELLOW_5_CITATIONS,
  "FD&C Yellow No. 5": YELLOW_5_CITATIONS,
  E102: YELLOW_5_CITATIONS,
  "CI 19140": YELLOW_5_CITATIONS,
  "Food Yellow 4": YELLOW_5_CITATIONS,
  "Acid Yellow 23": YELLOW_5_CITATIONS,
  "INS 102": YELLOW_5_CITATIONS,
  "C.I. 19140": YELLOW_5_CITATIONS,
  "Trisodium 1-(4-sulfophenyl)-4-(4-sulfonatophenylazo)-5-pyrazolone-3-carboxylate":
    YELLOW_5_CITATIONS,

  // Preservatives
  "Sodium Benzoate": SODIUM_BENZOATE_CITATIONS,
  E211: SODIUM_BENZOATE_CITATIONS,
  "Benzoate of Soda": SODIUM_BENZOATE_CITATIONS,
  "Benzoic Acid Sodium Salt": SODIUM_BENZOATE_CITATIONS,
  Benzetron: SODIUM_BENZOATE_CITATIONS,

  BHA: BHA_CITATIONS,
  "Butylated Hydroxyanisole": BHA_CITATIONS,
  "2(3)-tert-Butyl-4-hydroxyanisole": BHA_CITATIONS,
  "Tert-butyl-4-methoxyphenol": BHA_CITATIONS,
  Butylhydroxyanisole: BHA_CITATIONS,
  "2(3)-t-Butylhydroquinone monomethyl ether": BHA_CITATIONS,
  "Antioxyne B": BHA_CITATIONS,
  BOA: BHA_CITATIONS,
  "Tert-butyl-4-hydroxyanisole": BHA_CITATIONS,

  BHT: BHT_CITATIONS,
  "Butylated Hydroxytoluene": BHT_CITATIONS,
  "2,6-Di-tert-butyl-4-methylphenol": BHT_CITATIONS,
  DBPC: BHT_CITATIONS,
  "Ditertiary-butyl hydroxytoluene": BHT_CITATIONS,
  "2,6-Bis(1,1-dimethylethyl)-4-methylphenol": BHT_CITATIONS,
  Butilhidroxitolueno: BHT_CITATIONS,

  // -----------------------------
  // 2. Seed Oils and Refined Fats
  // -----------------------------
  "Soybean Oil": [
    {
      title: "Soybean Oil Consumption and Health Outcomes",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4511588/",
      footnote: "Study on the health impacts of soybean oil in diets",
    },
  ],
  "Canola Oil": [
    {
      title:
        "The effects of Canola oil on cardiovascular risk factors: A systematic review and meta-analysis with dose-response analysis of controlled clinical trials",
      link: "https://pubmed.ncbi.nlm.nih.gov/33127255/",
      footnote:
        "Study on the metabolic and cardiovascular effects of canola oil",
    },
  ],
  "Rapeseed Oil": [
    {
      title: "Nutritional Profile and Health Implications of Canola Oil",
      link: "https://pubmed.ncbi.nlm.nih.gov/24261521/",
      footnote:
        "Study on the metabolic and cardiovascular effects of canola oil",
    },
  ],
  "Corn Oil": [
    {
      title: "Cardiovascular Benefits of Corn Oil Compared to Other Fats",
      link: "https://pubmed.ncbi.nlm.nih.gov/1955619/",
      footnote: "Research on corn oil's cardiovascular properties",
    },
  ],
  "Sunflower Oil": [
    {
      title: "Sunflower Oil Consumption and Lipid Profiles",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5473013/",
      footnote: "Study on the effects of sunflower oil on lipid health",
    },
  ],
  "Safflower Oil": [
    {
      title:
        "Effect of high-oleic and high-linoleic safflower oils on mammary tumors induced in rats by 7,12-dimethylbenz(alpha)anthracene",
      link: "https://pubmed.ncbi.nlm.nih.gov/196058/",
      footnote: "Study on safflower oil's role in managing lipid profiles",
    },
  ],
  "Grapeseed Oil": [
    {
      title:
        "Grape seed extract inhibits advanced human prostate tumor growth and angiogenesis and upregulates insulin-like growth factor binding protein-3",
      link: "https://pubmed.ncbi.nlm.nih.gov/14696100/",
      footnote: "Comprehensive review of grapeseed oil's health effects",
    },
  ],
  "Palm Oil": [
    {
      title: "Palm Oil and Cardiovascular Disease Risk",
      link: "https://pubmed.ncbi.nlm.nih.gov/29489910/",
      footnote: "Study on the cardiovascular impacts of palm oil",
    },
  ],
  // -----------------------------
  // 3. Artificial Preservatives
  // -----------------------------
  Benzeme: [
    {
      title: "Benzene as a Chemical Hazard in Processed Foods",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4745501/",
      footnote: "Study on sodium benzoate and benzene formation risks",
    },
  ],
  "Potassium Sorbate": [
    {
      title:
        "Effects of potassium sorbate on systemic inflammation and gut microbiota",
      link: "https://pubmed.ncbi.nlm.nih.gov/38211766/",
      footnote: "Evaluation of potassium sorbate as a food preservative",
    },
  ],
  EDTA: [
    {
      title: "Safety Assessment of EDTA in Foods",
      link: "https://doi.org/10.1016/S0278-6915(99)00125-8",
      footnote: "Study on the food safety aspects of EDTA",
    },
  ],
  "TBHQ Tertiary Butylhydroquinone": [
    {
      title:
        "Alarming impact of the excessive use of tert-butylhydroquinone in food products: A narrative review",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9764193/",
      footnote: "Review of TBHQ's antioxidant properties and safety",
    },
  ],
  "Sodium Nitrite/Nitrate": [
    {
      title:
        "Nitrites in Cured Meats, Health Risk Issues, Alternatives to Nitrites: A Review",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9654915/",
      footnote: "Study on sodium nitrite and cancer risk in meat products",
    },
  ],
  // -----------------------------
  //4. Food Dyes
  // -----------------------------
  "Tartrazine (Yellow 5)": TARTRAZINE_CITATIONS,
  "Allura Red AC (Red 40)": ALLURA_RED_CITATIONS,
  "Sunset Yellow FCF (Yellow 6)": SUNSET_YELLOW_CITATIONS,
  "Brilliant Blue FCF (Blue 1)": BRILLIANT_BLUE_CITATIONS,
  "Indigotine (Blue 2)": INDIGOTINE_CITATIONS,
  "Fast Green FCF (Green 3)": FAST_GREEN_CITATIONS,
  "Erythrosine (Red 3)": ERYTHROSINE_CITATIONS,
  "Potassium Bromate": [
    {
      title:
        "Potassium Bromate Induces Carcinogenesis in Rat Thyroid Follicular Cells",
      link: "https://ehp.niehs.nih.gov/doi/10.1289/ehp.9087309",
      footnote:
        "Research on the carcinogenic effects of potassium bromate in rats",
    },
  ],
  Acrylamide: [
    {
      title: "Acrylamide Carcinogenicity and Human Health",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4164905/",
      footnote:
        "Review of acrylamide's carcinogenic potential and health implications",
    },
  ],
  "Aflatoxin B1": [
    {
      title: "Aflatoxins, hepatocellular carcinoma and public health",
      link: "https://pubmed.ncbi.nlm.nih.gov/23539499/",
      footnote: "Study linking aflatoxin B1 exposure to liver cancer",
    },
  ],
  "Polycyclic Aromatic Hydrocarbons": [
    {
      title:
        "Polycyclic Aromatic Hydrocarbons and Digestive Tract Cancers: A Perspective",
      link: "https://www.tandfonline.com/doi/abs/10.1080/10590501.2011.629974",
      footnote: "Investigation of PAH consumption and colorectal cancer risk",
    },
  ],
  "Heterocyclic Amines": [
    {
      title:
        "Dietary intake of heterocyclic amines, meat-derived mutagenic activity, and risk of colorectal adenomas",
      link: "https://pubmed.ncbi.nlm.nih.gov/11352869/",
      footnote: "Study on the association between HCAs and colorectal adenomas",
    },
  ],
  Formaldehyde: [
    {
      title: "Formaldehyde Exposure and Cancer Risk",
      link: "https://doi.org/10.1093/annonc/mdm202",
      footnote: "Review of formaldehyde's carcinogenicity in humans",
    },
  ],
  "Butylated Hydroxyanisole (BHT)": [
    {
      title: "Carcinogenicity of Butylated Hydroxyanisole",
      link: "https://www.ncbi.nlm.nih.gov/books/NBK590883/",
      footnote: "Research on BHA's potential to induce cancer in animals",
    },
  ],

  "Butylated Hydroxytoluene (BHT)": [
    {
      title: "Toxicological Evaluation of Butylated Hydroxytoluene (BHT)",
      link: "https://pubmed.ncbi.nlm.nih.gov/12396675/",
      footnote: "Study assessing the carcinogenic risk of BHT",
    },
  ],
  "Artificial Sweeteners": [
    {
      title: "Artificial Sweeteners and Cancer Risk",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8946744/",
      footnote:
        "Epidemiological study on the link between artificial sweeteners and cancer",
    },
  ],
  "Citrus Red 2": [
    {
      title: "Toxicology of food dyes",
      link: "https://pubmed.ncbi.nlm.nih.gov/23026007/",
      footnote:
        "Study on the cancer-causing potential of Citrus Red 2 in animal models",
    },
  ],
  "Brown HT": [
    {
      title:
        "Three-generation toxicity study of rats ingesting Brown HT in the diet",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7130881/",
      footnote:
        "Examination of the toxic effects of Brown HT dye in a rat model",
    },
  ],
  "Annatto Extract": [
    {
      title: "Anaphylaxis to annatto dye: a case report",
      link: "https://pubmed.ncbi.nlm.nih.gov/1994783/",
      footnote:
        "Research on the potential allergenic effects of annatto colorant in humans",
    },
  ],
  "Butylated Hydroxyanisole (BHA)": [
    {
      title:
        "Carcinogenicity and modification of the carcinogenic response by BHA, BHT, and other antioxidants",
      link: "https://pubmed.ncbi.nlm.nih.gov/3899519/",
      footnote: "Research on the carcinogenicity of BHA in animal models",
    },
  ],
  "Propyl Gallate": [
    {
      title: "Final report on the amended safety assessment of Propyl Gallate",
      link: "https://pubmed.ncbi.nlm.nih.gov/18080874/",
      footnote: "Evaluation of the toxicological data on propyl gallate",
    },
  ],
  Azodicarbonamide: [
    {
      title: "Toxicological Profile of Azodicarbonamide in Food Processing",
      link: "https://pubmed.ncbi.nlm.nih.gov/32772004/",
      footnote: "Assessment of health risks associated with azodicarbonamide",
    },
  ],
  "Artificial Food Coloring": [
    {
      title: "Behavioral Effects of Artificial Food Colors in Children",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9052604/",
      footnote:
        "Study linking artificial food colors to hyperactivity in children",
    },
  ],
  "Partially Hydrogenated Oils": [
    {
      title: "Trans Fatty Acids and Cardiovascular Disease",
      link: "https://pubmed.ncbi.nlm.nih.gov/16611951/",
      footnote: "Research on the impact of trans fats on heart health",
    },
  ],
  "Monosodium Glutamate (MSG)": [
    {
      title:
        "Extensive use of monosodium glutamate: A threat to public health?",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5938543/",
      footnote: "Review of studies on MSG's potential neurotoxicity",
    },
  ],
  "Polysorbate 80": [
    {
      title:
        "Polysorbate 80-induced leaky gut impairs skeletal muscle metabolism in mice",
      link: "https://pubmed.ncbi.nlm.nih.gov/33113283/",
      footnote: "Study on how Polysorbate 80 affects gut barrier function",
    },
  ],
  Carrageenan: [
    {
      title: "Carrageenan-Induced Inflammation in Gastrointestinal Tract",
      link: "https://pubmed.ncbi.nlm.nih.gov/38732613/",
      footnote:
        "Research on the inflammatory effects of carrageenan in the gut",
    },
  ],

  "Titanium Dioxide": [
    {
      title:
        "Titanium dioxide nanoparticles exacerbate DSS-induced colitis: role of the NLRP3 inflammasome",
      link: "https://pubmed.ncbi.nlm.nih.gov/26848183/",
      footnote:
        "Research indicating that Titanium Dioxide nanoparticles can worsen colitis.",
    },
  ],
  "Trans Fats": [
    {
      title:
        "The Effect of Trans Fatty Acids on Human Health: Regulation and Consumption Patterns",
      link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8535577/",
      footnote:
        "Research linking trans fat consumption to increased coronary heart disease risk.",
    },
  ],
  "Fructose Corn Syrup": [
    {
      title:
        "Consumption of high-fructose corn syrup in beverages may play a role in the epidemic of obesity",
      link: "https://pubmed.ncbi.nlm.nih.gov/15051594/",
      footnote:
        "Study associating high-fructose corn syrup intake with obesity.",
    },
  ],
  "Non-sugar sweeteners": [
    {
      title:
        "Artificial sweeteners induce glucose intolerance by altering the gut microbiota",
      link: "https://pubmed.ncbi.nlm.nih.gov/25231862/",
      footnote:
        "Research indicating that artificial sweeteners can cause glucose intolerance via gut microbiota changes.",
    },
  ],
  Phthalates: [
    {
      title: "Phthalates and Their Impacts on Human Health",
      link: "https://pubmed.ncbi.nlm.nih.gov/34069956/",
      footnote:
        "Study reviewing dietary exposure to phthalates and associated health risks.",
    },
  ],
  "Bisphenol A": [
    {
      title:
        "A comprehensive review on the carcinogenic potential of bisphenol A: clues and evidence",
      link: "https://pubmed.ncbi.nlm.nih.gov/33666848/",
      footnote:
        "Research linking BPA exposure to behavioral issues in children.",
    },
  ],
  Parabens: [
    {
      title: "Paraben exposure and ovarian dysfunction: A review",
      link: "https://doi.org/10.1289/ehp.1205350",
      footnote:
        "Study discussing the impact of parabens on ovarian health and endocrine disruption.",
    },
  ],
  Dimethylpolysiloxane: [
    {
      title:
        "Re-evaluation of dimethyl polysiloxane (E 900) as a food additive",
      link: "https://doi.org/10.2903/j.efsa.2020.6107",
      footnote:
        "Study assessing the safety and potential health impacts of dimethylpolysiloxane.",
    },
  ],
  "Artificial Flavors": [
    {
      title: "Artificial food additives: hazardous to long-term health?",
      link: "https://pubmed.ncbi.nlm.nih.gov/38423749/",
      footnote:
        "Research evaluating the potential toxic effects of artificial flavors.",
    },
  ],
  "Hydrogenated Oils": [
    {
      title:
        "Hydrogenated oils and trans fatty acids: Health effects and implications for regulation",
      link: "https://pubmed.ncbi.nlm.nih.gov/19345947/",
      footnote:
        "Study on the health risks associated with hydrogenated oils and trans fats.",
    },
  ],
  "Ethylenediaminetetraacetic Acid": [
    {
      title:
        "Toxicological evaluation of EDTA and its use in food preservation",
      link: "https://pubmed.ncbi.nlm.nih.gov/8128003/",
      footnote:
        "Study assessing the safety profile of EDTA as a food additive.",
    },
  ],
  "Caramel Coloring": [
    {
      title:
        "Caramel coloring and its association with 4-MEI exposure: A toxicological review",
      link: "https://pubmed.ncbi.nlm.nih.gov/25693062/",
      footnote:
        "Study evaluating the carcinogenic potential of 4-MEI in caramel coloring.",
    },
  ],
  "Benzoyl Peroxide": [
    {
      title: "Safety assessment of benzoyl peroxide in food applications",
      link: "https://pubmed.ncbi.nlm.nih.gov/14249969/",
      footnote:
        "Study discussing the potential health risks of benzoyl peroxide in foods.",
    },
  ],

  "High-Intensity Sweeteners": [
    {
      title:
        "Cyclamate sweetener and its potential role in bladder carcinogenesis",
      link: "https://pubmed.ncbi.nlm.nih.gov/660869/",
      footnote:
        "Study examining the carcinogenic effects of cyclamate in animal models.",
    },
  ],
};
