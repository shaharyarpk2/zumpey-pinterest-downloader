"""
Zumpey.com: 1-Click Release Packager
Packages the extension into dist/zumpey.zip and updates updates.xml
"""

import os
import json
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
MANIFEST_PATH = os.path.join(ROOT_DIR, 'manifest.json')
UPDATES_XML_PATH = os.path.join(ROOT_DIR, 'updates.xml')

def build_release():
    print('[Zumpey.com] Starting Release Packaging...')
    
    # 1. Read manifest version
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version', '1.0.0')
    print(f'[Zumpey.com] Current Version: v{version}')

    # 2. Prepare dist directory
    os.makedirs(DIST_DIR, exist_ok=True)
    zip_output_path = os.path.join(DIST_DIR, 'zumpey.zip')
    versioned_zip = os.path.join(DIST_DIR, f'zumpey-v{version}.zip')

    # 3. Create clean zip
    include_dirs = ['icons', 'lib', 'src']
    include_files = ['manifest.json', 'updates.xml', 'README.md']

    with zipfile.ZipFile(zip_output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_name in include_files:
            file_path = os.path.join(ROOT_DIR, file_name)
            if os.path.exists(file_path):
                zipf.write(file_path, arcname=file_name)
                print(f'  Added: {file_name}')

        for dir_name in include_dirs:
            dir_path = os.path.join(ROOT_DIR, dir_name)
            if os.path.exists(dir_path):
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, ROOT_DIR)
                        zipf.write(full_path, arcname=rel_path)
                        print(f'  Added: {rel_path}')

    shutil.copyfile(zip_output_path, versioned_zip)
    print(f'\n[Zumpey.com] Successfully built release zip: {zip_output_path}')
    print(f'[Zumpey.com] Versioned release archive: {versioned_zip}')

    # 4. Sync updates.xml version
    xml_content = f"""<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='zumpeypinterestbatchdownloader001'>
    <updatecheck codebase='https://raw.githubusercontent.com/shaharyarkp2/zumpey-pinterest-downloader/main/dist/zumpey.zip' version='{version}' />
  </app>
</gupdate>
"""
    with open(UPDATES_XML_PATH, 'w', encoding='utf-8') as f:
        f.write(xml_content)
    print(f'[Zumpey.com] updates.xml synced to version {version}')

if __name__ == '__main__':
    build_release()
