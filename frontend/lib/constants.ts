export const MONTHS_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
]

export const MONTHS_PL_ABBR = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
]

export const DAY_NAMES_PL = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.']

export const getAttendanceColor = (rate: number): string => {
  if (rate >= 90) return '#002D62'
  if (rate >= 70) return 'var(--attendance-medium)'
  return 'var(--error)'
}

export const EP_GROUP_FULL: Record<string, string> = {
  EPP: 'Europejska Partia Ludowa',
  'S&D': 'Socjaliści i Demokraci',
  'Renew Europe': 'Odnówmy Europę',
  Renew: 'Odnówmy Europę',
  'Patriots for Europe': 'Patrioci dla Europy',
  ECR: 'Europejscy Konserwatyści i Reformatorzy',
  ESN: 'Europa Suwerennych Narodów',
  Greens: 'Zieloni / Wolne Przymierze Europejskie',
  NI: 'Niezrzeszeni',
  Niezrzeszeni: 'Niezrzeszeni',
}

export const COMMITTEE_NAMES_EN: Record<string, string> = {
  AFCO: 'Constitutional Affairs',
  AFET: 'Foreign Affairs',
  AGRI: 'Agriculture and Rural Development',
  AIDA: 'Artificial Intelligence in a Digital Age',
  BECA: 'COVID-19 Pandemic Lessons',
  BUDG: 'Budgets',
  CLIM: 'Climate Change, Biodiversity and Sustainable Development',
  CONT: 'Budgetary Control',
  CULT: 'Culture and Education',
  DEVE: 'Development',
  DROI: 'Human Rights',
  ECON: 'Economic and Monetary Affairs',
  EMPL: 'Employment and Social Affairs',
  ENVI: 'Environment, Public Health and Food Safety',
  FEMM: "Women's Rights and Gender Equality",
  IMCO: 'Internal Market and Consumer Protection',
  INTA: 'International Trade',
  ITRE: 'Industry, Research and Energy',
  JURI: 'Legal Affairs',
  LIBE: 'Civil Liberties, Justice and Home Affairs',
  PECH: 'Fisheries',
  PETI: 'Petitions',
  REGI: 'Regional Development',
  SEDE: 'Security and Defence',
  TAXI: 'Tax Matters',
  TRAN: 'Transport and Tourism',
}

export const COMMITTEE_ROLE_LABELS: Record<string, string> = {
  member: 'Członek',
  chair: 'Przewodniczący',
  'vice-chair': 'Wiceprzewodniczący',
  substitute: 'Zastępca',
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  REPORT_PLENARY: 'Sprawozdanie',
  RESOLUTION_MOTION: 'Rezolucja',
  RESOLUTION_MOTION_JOINT: 'Rezolucja wspólna',
}

export const DOC_ROLE_LABELS: Record<string, string> = {
  RAPPORTEUR: 'Sprawozdawca',
  RAPPORTEUR_CO: 'Współsprawozdawca',
  AUTHOR: 'Autor/ka',
}
