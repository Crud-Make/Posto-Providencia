#!/usr/bin/env python3
"""
Script to migrate frentista closing data from Excel CSV to Supabase
"""
import csv
import re
import subprocess
import json

# Mapping of frentista names from Excel to Supabase IDs
FRENTISTA_MAP = {
    'Filip': 1,
    'Paulo': 2,
    'Barbra': 3,
    'Rosimeire': 4,
    'Sinho': 5,
    'Nayla': 6,
    'Elyon': 7
}

# Mapping of column positions (0-based)
FRENTISTA_COLS = {
    'Filip': 3,
    'Paulo': 4,
    'Barbra': 5,
    'Rosimeire': 6,
    'Sinho': 7,
    'Nayla': 8,
    'Elyon': 9
}

# Map Excel row types to database fields
ROW_TYPES = {
    'Pix': 'valor_pix',
    'Cartao Credito': 'valor_cartao_credito',
    'Cartao Debito': 'valor_cartao_debito',
    'Moeda': 'valor_moedas',
    'Notas': 'valor_nota',
    'Baratao': 'baratao',
    'Dinheiro': 'valor_dinheiro',
    'Venda Frentistas.': 'encerrante'  # Total vendas frentista
}

def parse_day_from_header(line):
    """Extract day number from header like 'Caixa Dia 01 Posto Jorro.'"""
    match = re.search(r'Caixa Dia (\d+)', line)
    return int(match.group(1)) if match else None

def read_csv_file(filename):
    """Read CSV file and return structured data"""
    data = []
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            data.append(row)
    return data

def extract_frentista_data(data, start_row, end_row):
    """Extract frentista sales data from a day's section"""
    frentista_data = {}

    for row in data[start_row:end_row]:
        if not row or len(row) < 10:
            continue

        row_type = row[2].strip()

        # Map row type to database field
        db_field = ROW_TYPES.get(row_type)
        if not db_field:
            continue

        # Extract values for each frentista
        for frentista_name, col_idx in FRENTISTA_COLS.items():
            if frentista_name not in frentista_data:
                frentista_data[frentista_name] = {}

            value = row[col_idx].strip() if len(row) > col_idx else ''
            if value:
                try:
                    frentista_data[frentista_name][db_field] = float(value)
                except ValueError:
                    frentista_data[frentista_name][db_field] = 0
            else:
                frentista_data[frentista_name][db_field] = 0

    return frentista_data

def find_day_sections(data):
    """Find the start and end rows for each day"""
    sections = {}
    current_day = None
    start_row = None

    for i, row in enumerate(data):
        if not row:
            continue

        day = parse_day_from_header(row[1] if len(row) > 1 else '')
        if day is not None:
            if current_day is not None and start_row is not None:
                sections[current_day] = (start_row, i)
            current_day = day
            start_row = i

    # Add last section
    if current_day is not None and start_row is not None:
        sections[current_day] = (start_row, len(data))

    return sections

def execute_supabase_query(query):
    """Execute a Supabase query using MCP server"""
    cmd = [
        'supabase-mcp-server',
        'execute_sql',
        '--project-id', 'kilndogpsffkgkealkaq',
        '--query', query
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error executing query: {result.stderr}")
        return None

    # Parse JSON output
    try:
        # Extract the JSON from the output
        match = re.search(r'<untrusted-data-[0-9a-f-]+>(.*?)</untrusted-data-', result.stdout, re.DOTALL)
        if match:
            return json.loads(match.group(1))
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")

    return None

def get_fechamento_id(day, month='01', year='2026'):
    """Get the fechamento ID for a specific day"""
    date_str = f"{year}-{month}-{day:02d}"
    query = f'''
    SELECT "id", "data", "total_vendas"
    FROM "Fechamento"
    WHERE "data"::date = '{date_str}'::date
    AND "posto_id" = 1
    LIMIT 1
    '''
    result = execute_supabase_query(query)
    return result[0] if result else None

def get_existing_fechamento_frentista(fechamento_id, frentista_id):
    """Get existing FechamentoFrentista record"""
    query = f'''
    SELECT "id", "valor_cartao_credito", "valor_cartao_debito", "valor_nota",
           "valor_pix", "valor_dinheiro", "valor_moedas", "baratao", "encerrante"
    FROM "FechamentoFrentista"
    WHERE "fechamento_id" = {fechamento_id}
    AND "frentista_id" = {frentista_id}
    '''
    result = execute_supabase_query(query)
    return result[0] if result else None

def update_fechamento_frentista(record_id, fields):
    """Update an existing FechamentoFrentista record"""
    set_clauses = []
    values = []

    for field, value in fields.items():
        if value is not None:
            set_clauses.append(f'"{field}" = %s')
            values.append(value)

    if not set_clauses:
        return False

    query = f'''
    UPDATE "FechamentoFrentista"
    SET {', '.join(set_clauses)}
    WHERE "id" = {record_id}
    '''

    execute_supabase_query(query)
    return True

def insert_fechamento_frentista(fechamento_id, frentista_id, fields):
    """Insert a new FechamentoFrentista record"""
    columns = ['"fechamento_id"', '"frentista_id"', '"posto_id"']
    values = [fechamento_id, frentista_id, 1]

    for field, value in fields.items():
        if value is not None:
            columns.append(f'"{field}"')
            values.append(value)

    value_str = ', '.join(['%s'] * len(values))
    column_str = ', '.join(columns)

    query = f'''
    INSERT INTO "FechamentoFrentista" ({column_str})
    VALUES ({value_str})
    RETURNING "id"
    '''

    result = execute_supabase_query(query)
    return result[0]['id'] if result else None

def process_day(day, csv_data):
    """Process a single day's data"""
    print(f"\n--- Processing Day {day} ---")

    # Get fechamento ID
    fechamento = get_fechamento_id(day)
    if not fechamento:
        print(f"  No fechamento found for day {day}")
        return

    print(f"  Fechamento ID: {fechamento['id']}, Total: {fechamento['total_vendas']}")

    # Find the section for this day in the CSV
    sections = find_day_sections(csv_data)
    if day not in sections:
        print(f"  No CSV section found for day {day}")
        return

    start_row, end_row = sections[day]
    frentista_data = extract_frentista_data(csv_data, start_row, end_row)

    # Process each frentista
    for frentista_name, values in frentista_data.items():
        if not values:
            continue

        frentista_id = FRENTISTA_MAP.get(frentista_name)
        if not frentista_id:
            print(f"  Unknown frentista: {frentista_name}")
            continue

        # Check if record exists
        existing = get_existing_fechamento_frentista(fechamento['id'], frentista_id)

        if existing:
            # Update existing record
            print(f"  Updating {frentista_name} (ID: {existing['id']})")
            update_fechamento_frentista(existing['id'], values)
        else:
            # Insert new record
            print(f"  Inserting {frentista_name}")
            insert_fechamento_frentista(fechamento['id'], frentista_id, values)

def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 migrate_frentista.py <csv_file> [day]")
        print("  csv_file: Path to the CSV file")
        print("  day: Optional - specific day to process (1-31)")
        sys.exit(1)

    csv_file = sys.argv[1]
    day = int(sys.argv[2]) if len(sys.argv) > 2 else None

    print(f"Reading CSV file: {csv_file}")
    csv_data = read_csv_file(csv_file)
    print(f"Total rows: {len(csv_data)}")

    # Find all days in the CSV
    sections = find_day_sections(csv_data)
    print(f"Found {len(sections)} days: {sorted(sections.keys())}")

    if day:
        # Process specific day
        if day in sections:
            process_day(day, csv_data)
        else:
            print(f"Day {day} not found in CSV")
    else:
        # Process all days
        for d in sorted(sections.keys()):
            process_day(d, csv_data)

    print("\n--- Migration complete ---")

if __name__ == '__main__':
    main()
