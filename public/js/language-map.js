/**
 * MAPEAMENTO DE PAÍSES E IDIOMAS
 * Determina o idioma baseado na nacionalidade do cliente
 */

export const paisParaIdioma = {
  // PORTUGUÊS
  'português': 'pt',
  'portuguesa': 'pt',
  'portugues': 'pt',
  'portugal': 'pt',
  'pt': 'pt',

  // INGLÊS - Reino Unido
  'britânico': 'en',
  'britanico': 'en',
  'inglês': 'en',
  'inglese': 'en',
  'british': 'en',
  'english': 'en',
  'gb': 'en',
  'reino unido': 'en',

  // INGLÊS - Irlanda
  'irlandês': 'en',
  'irlandese': 'en',
  'ireland': 'en',
  'irish': 'en',

  // INGLÊS - EUA
  'americano': 'en',
  'americana': 'en',
  'american': 'en',
  'usa': 'en',
  'us': 'en',

  // INGLÊS - Outros países anglófonos
  'australiano': 'en',
  'neozelandês': 'en',
  'canadiano': 'en',
  'australian': 'en',
  'new zealander': 'en',
  'canadian': 'en',
  'south african': 'en',

  // FRANCÊS
  'francês': 'en',
  'francesa': 'en',
  'french': 'en',
  'france': 'en',
  'fr': 'en',

  // ALEMÃO
  'alemão': 'en',
  'alemã': 'en',
  'german': 'en',
  'de': 'en',

  // ESPANHOL
  'espanhol': 'en',
  'espanhola': 'en',
  'spanish': 'en',
  'es': 'en',

  // ITALIANO
  'italiano': 'en',
  'italiana': 'en',
  'italian': 'en',
  'it': 'en',

  // HOLANDÊS
  'holandês': 'en',
  'holandesa': 'en',
  'dutch': 'en',
  'nl': 'en',

  // DINAMARQUÊS
  'dinamarquês': 'en',
  'danish': 'en',
  'dk': 'en',

  // SUECO
  'sueco': 'en',
  'sueca': 'en',
  'swedish': 'en',
  'se': 'en',

  // NORUEGUÊS
  'norueguês': 'en',
  'norwegian': 'en',
  'no': 'en',

  // FINS
  'finlandês': 'en',
  'finnish': 'en',
  'fi': 'en',

  // POLONÊS
  'polonês': 'en',
  'polish': 'en',
  'pl': 'en',

  // ROMENO
  'romeno': 'en',
  'romanian': 'en',
  'ro': 'en',

  // HÚNGARO
  'húngaro': 'en',
  'hungarian': 'en',
  'hu': 'en',

  // CHECO
  'checo': 'en',
  'czech': 'en',
  'cs': 'en',

  // ESLOVACO
  'eslovaco': 'en',
  'slovak': 'en',
  'sk': 'en',

  // GREGO
  'grego': 'en',
  'greek': 'en',
  'gr': 'en',

  // RUSSO
  'russo': 'en',
  'russian': 'en',
  'ru': 'en',

  // TURCO
  'turco': 'en',
  'turkish': 'en',
  'tr': 'en',

  // ISRAELITA
  'israelita': 'en',
  'israeli': 'en',
  'judeu': 'en',
  'il': 'en',

  // ÁRABE
  'arabe': 'en',
  'arabic': 'en',

  // JAPONÊS
  'japonês': 'en',
  'japanese': 'en',
  'jp': 'en',

  // CHINÊS
  'chinês': 'en',
  'chinese': 'en',
  'cn': 'en',

  // COREANO
  'coreano': 'en',
  'korean': 'en',
  'kr': 'en',

  // TAILANDÊS
  'tailandês': 'en',
  'thai': 'en',
  'th': 'en',

  // INDONÉSIO
  'indonésio': 'en',
  'indonesian': 'en',
  'id': 'en',

  // MALAIO
  'malaio': 'en',
  'malaysian': 'en',
  'my': 'en',

  // VIETNAMITA
  'vietnamita': 'en',
  'vietnamese': 'en',
  'vn': 'en',

  // TAILÂNDIA
  'tailandês': 'en',

  // BRASIL
  'brasileiro': 'pt',
  'brasileira': 'pt',
  'brazil': 'pt',
  'br': 'pt',

  // ANGOLA
  'angolano': 'pt',
  'angolana': 'pt',
  'angola': 'pt',
  'ao': 'pt',

  // MOÇAMBIQUE
  'moçambicano': 'pt',
  'moçambicana': 'pt',
  'mozambicano': 'pt',
  'mozambicana': 'pt',
  'mozambique': 'pt',
  'mz': 'pt',

  // MACAU
  'macaense': 'pt',
  'macanese': 'pt',
  'macau': 'pt',

  // TIMOR-LESTE
  'timorense': 'pt',
  'timor': 'pt',
  'tl': 'pt',

  // GUINÉ-BISSAU
  'guineense': 'pt',
  'guinea-bissau': 'pt',

  // CABO VERDE
  'cabo-verdiano': 'pt',
  'cabo verde': 'pt',
  'cv': 'pt',

  // SÃO TOMÉ E PRÍNCIPE
  'são-tomense': 'pt',
  'sao-tomense': 'pt',
};

/**
 * Obtém o idioma baseado na nacionalidade
 * @param {string} nacionalidade - Nacionalidade do cliente
 * @returns {string} - Idioma (pt, en)
 */
export function obterIdiomaDeNacionalidade(nacionalidade) {
  if (!nacionalidade) return 'pt'; // Padrão português

  const nat = nacionalidade.toLowerCase().trim();
  const idioma = paisParaIdioma[nat];

  // Se encontrou mapeamento, retorna
  if (idioma) return idioma;

  // Procurar por substring (parcial)
  for (const [pais, lang] of Object.entries(paisParaIdioma)) {
    if (nat.includes(pais) || pais.includes(nat)) {
      return lang;
    }
  }

  // Padrão português
  return 'pt';
}

export default { paisParaIdioma, obterIdiomaDeNacionalidade };
