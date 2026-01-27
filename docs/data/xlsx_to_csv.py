#!/usr/bin/env python3
"""
Script to convert Excel xlsx to CSV without pandas
"""
import zipfile
import xml.etree.ElementTree as ET
import sys
import csv
import re

def get_shared_strings(zip_file):
    """Extract shared strings from the Excel file"""
    try:
        with zip_file.open('xl/sharedStrings.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            strings = []
            for si in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                t = si.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                if t is not None:
                    strings.append(t.text or '')
                else:
                    strings.append('')
            return strings
    except:
        return []

def parse_cell_reference(cell_ref):
    """Parse cell reference like 'A1' to get column and row"""
    match = re.match(r'([A-Z]+)(\d+)', cell_ref)
    if match:
        col = match.group(1)
        row = int(match.group(2)) if match.group(2) else 0
        return col, row
    return None, 0

def column_letter_to_index(col):
    """Convert column letter to index (A=0, B=1, etc)"""
    index = 0
    for char in col:
        index = index * 26 + (ord(char) - ord('A') + 1)
    return index - 1

def read_worksheet(zip_file, sheet_name, shared_strings):
    """Read worksheet XML and return rows as lists"""
    # First, find the sheet file that corresponds to the sheet name
    r_id = None
    with zip_file.open('xl/workbook.xml') as f:
        tree = ET.parse(f)
        root = tree.getroot()
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        for sheet in root.findall('.//ns:sheet', ns):
            if sheet.get('name') == sheet_name:
                r_id = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                break

    if r_id is None:
        raise ValueError(f"Sheet '{sheet_name}' not found")

    # Read relationships to find which sheet file corresponds to this sheet
    sheet_file = None
    with zip_file.open('xl/_rels/workbook.xml.rels') as f:
        tree = ET.parse(f)
        root = tree.getroot()
        ns = {'ns': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        for rel in root.findall('.//ns:Relationship', ns):
            if rel.get('Id') == r_id:
                target = rel.get('Target')
                if target is not None:
                    sheet_file = 'xl/' + target
                break

    if sheet_file is None:
        raise ValueError(f"Could not find worksheet file for sheet '{sheet_name}'")

    # Read the worksheet
    with zip_file.open(sheet_file) as f:
        tree = ET.parse(f)
        root = tree.getroot()
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        # Get all cells
        cells = root.findall('.//ns:c', ns)

        # Organize cells by row and column
        rows = {}
        for cell in cells:
            cell_ref = cell.get('r')
            col, row = parse_cell_reference(cell_ref)
            col_idx = column_letter_to_index(col)

            # Get cell value
            v = cell.find('ns:v', ns)
            cell_type = cell.get('t', 'n')

            if v is not None:
                value = v.text
                if cell_type == 's' and shared_strings:
                    # It's a shared string
                    try:
                        if value is not None:
                            value = shared_strings[int(value)]
                        else:
                            value = ''
                    except:
                        pass
            else:
                value = ''

            if row not in rows:
                rows[row] = {}
            rows[row][col_idx] = value

        # Convert to list of lists
        max_row = max(rows.keys()) if rows else 0

        # Find max columns across all rows
        max_col = 0
        for row_num in rows:
            if rows[row_num]:
                row_cols = list(rows[row_num].keys())
                if row_cols:
                    current_max = max(row_cols)
                    if current_max > max_col:
                        max_col = current_max

        data = []
        for row_num in range(1, max_row + 1):
            row_data = []
            if row_num in rows:
                for col_idx in range(max_col + 1):
                    row_data.append(rows[row_num].get(col_idx, ''))
            else:
                for col_idx in range(max_col + 1):
                    row_data.append('')
            data.append(row_data)

        return data

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 xlsx_to_csv.py <xlsx_file> <sheet_name> [output_csv]")
        sys.exit(1)

    xlsx_file = sys.argv[1]
    sheet_name = sys.argv[2]
    output_csv = sys.argv[3] if len(sys.argv) > 3 else f'{sheet_name}.csv'

    with zipfile.ZipFile(xlsx_file, 'r') as zip_ref:
        shared_strings = get_shared_strings(zip_ref)
        data = read_worksheet(zip_ref, sheet_name, shared_strings)

        # Write to CSV
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(data)

        print(f"Successfully converted {sheet_name} to {output_csv}")
        print(f"Total rows: {len(data)}")
