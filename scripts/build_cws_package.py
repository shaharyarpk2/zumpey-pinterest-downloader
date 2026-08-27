"""
Zumpey.com: Chrome Web Store Official Package Builder
Packages a pristine ZIP archive compliant with Chrome Web Store upload guidelines.
"""

import os
import json
import zipfile

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
MANIFEST_PATH = os.path.join(ROOT_DIR, 'manifest.json')

def build_cws_package():
    print('[Zumpey.com] Starting Chrome Web Store Packaging...')
    
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version', '1.0.0')
    print(f'[Zumpey.com] Manifest Version: v{version}')

    os.makedirs(DIST_DIR, exist_ok=True)
    cws_zip_path = os.path.join(DIST_DIR, 'zumpey-cws.zip')
    versioned_cws_zip = os.path.join(DIST_DIR, f'zumpey-cws-v{version}.zip')

    include_dirs = ['icons', 'lib', 'src']
    include_files = ['manifest.json']

    total_files = 0
    with zipfile.ZipFile(cws_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_name in include_files:
            file_path = os.path.join(ROOT_DIR, file_name)
            if os.path.exists(file_path):
                zipf.write(file_path, arcname=file_name)
                print(f'  Added: {file_name}')
                total_files += 1

        for dir_name in include_dirs:
            dir_path = os.path.join(ROOT_DIR, dir_name)
            if os.path.exists(dir_path):
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, ROOT_DIR)
                        zipf.write(full_path, arcname=rel_path)
                        print(f'  Added: {rel_path}')
                        total_files += 1

    import shutil
    shutil.copyfile(cws_zip_path, versioned_cws_zip)
    
    zip_size = os.path.getsize(cws_zip_path)
    print(f'\n[Zumpey.com] SUCCESS! Pristine CWS ZIP built:')
    print(f'  File: {cws_zip_path}')
    print(f'  Size: {zip_size:,} bytes ({round(zip_size / 1024, 2)} KB)')
    print(f'  Total Files Packaged: {total_files}')
    print(f'  Ready for upload at: https://chrome.google.com/webstore/devconsole\n')

if __name__ == '__main__':
    build_cws_package()
