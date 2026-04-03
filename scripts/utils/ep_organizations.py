"""
European Parliament Organizations Mapping

Maps organization IDs to readable names for Polish MEPs.
Data based on European Parliament Open Data Portal.
"""

# Polish National Political Parties
# Based on actual EP API data from current term (2024-2029)
POLISH_PARTIES = {
    'org/1147': 'Platforma Obywatelska (PO)',
    'org/5460': 'Koalicja Obywatelska (KO)',
    'org/5311': 'Nowa Lewica',
    'org/5313': 'Nowa Lewica',
    'org/5524': 'Polska 2050',  # Verified: Kamila GASIUK-PIHOWICZ
    'org/6700': 'Prawo i Sprawiedliwość (PiS)',
    'org/6702': 'Prawo i Sprawiedliwość (PiS)',  # Verified: Jadwiga WIŚNIEWSKA
    'org/6703': 'Koalicja Obywatelska (KO)',
    'org/6704': 'Polskie Stronnictwo Ludowe (PSL)',  # Verified: Krzysztof HETMAN
    'org/6720': 'Prawo i Sprawiedliwość (PiS)',
    'org/6836': 'Koalicja Obywatelska (KO)',  # Verified: Łukasz KOHUT, Magdalena ADAMOWICZ, Michał WAWRYKIEWICZ (independents elected on KO lists 2024)
    'org/6856': 'Konfederacja',
    'org/6893': 'Trzecia Droga',
    'org/6899': 'Nowa Lewica',  # Verified: Robert BIEDROŃ
    'org/7020': 'Koalicja Obywatelska (KO)',
    'org/7029': 'Konfederacja Korony Polskiej (KKP)',  # Verified: Grzegorz BRAUN (far-right)
    'org/9675': 'Koalicja Obywatelska (KO)',
    'org/7979': 'Koalicja Obywatelska (KO)',  # Verified: Bogdan ZDROJEWSKI, Dariusz JOŃSKI
}

# EP Political Groups
EP_GROUPS = {
    'org/1473': 'EPP (Europejska Partia Ludowa)',
    'org/1472': 'S&D (Socjaliści i Demokraci)',
    'org/1533': 'Renew Europe',
    'org/1269': 'Greens/EFA (Zieloni)',
    'org/2502': 'ECR (Europejscy Konserwatyści i Reformatorzy)',
    'org/7499': 'The Left (Lewica)',
    'org/8667': 'NI (Niezrzeszeni)',
    'org/5148': 'ECR (Europejscy Konserwatyści i Reformatorzy)',
    'org/5153': 'EPP (Europejska Partia Ludowa)',
    'org/5154': 'S&D (Socjaliści i Demokraci)',  # Verified: Previous term group (2019-2024)
    'org/6561': 'NI (Niezrzeszeni)',  # Verified: Grzegorz BRAUN (non-attached)
    'org/7035': 'Renew Europe',  # Verified: Michał KOBOSKO (Polska 2050)
    'org/7037': 'ECR (Europejscy Konserwatyści i Reformatorzy)',
    'org/7018': 'EPP (Europejska Partia Ludowa)',  # Verified: Łukasz KOHUT (current, elected as Independent)
    'org/7038': 'S&D (Socjaliści i Demokraci)',  # Verified: Robert BIEDROŃ (current term 2024+)
    'org/7150': 'Patriots for Europe (Patrioci)',  # Verified: Anna BRYŁKA, Tomasz BUCZEK (joined Oct 2024)
    'org/7151': 'ESN (Europa Suwerennych Narodów)',  # Verified: Konfederacja MEPs (far-right)
}


def get_party_name(org_id: str) -> str:
    """
    Get Polish party name from organization ID.

    Args:
        org_id: Organization ID (e.g., 'org/6702')

    Returns:
        Party name or the original ID if not found
    """
    if not org_id:
        return ''

    return POLISH_PARTIES.get(org_id, org_id)


def get_group_name(org_id: str) -> str:
    """
    Get EP group name from organization ID.

    Args:
        org_id: Organization ID (e.g., 'org/1473')

    Returns:
        Group name or the original ID if not found
    """
    if not org_id:
        return ''

    return EP_GROUPS.get(org_id, org_id)


def get_party_short_name(org_id: str) -> str:
    """
    Get short party name (acronym only).

    Args:
        org_id: Organization ID

    Returns:
        Short name like 'PiS', 'PO', 'PSL'
    """
    full_name = get_party_name(org_id)

    # Extract acronym from parentheses
    if '(' in full_name and ')' in full_name:
        start = full_name.index('(') + 1
        end = full_name.index(')')
        return full_name[start:end]

    return full_name


def get_group_short_name(org_id: str) -> str:
    """
    Get short EP group name (acronym only).

    Args:
        org_id: Organization ID

    Returns:
        Short name like 'EPP', 'S&D', 'ECR'
    """
    full_name = get_group_name(org_id)

    # Extract acronym before parentheses
    if '(' in full_name:
        return full_name.split('(')[0].strip()

    return full_name
