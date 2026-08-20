"""
Zumpey.com: 1-Click Release & CRX Packager
Packages clean ZIP archives, signs permanent CRX, and synchronizes updates.xml
"""

import os
import json
import zipfile
import shutil
import subprocess
import tempfile

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
MANIFEST_PATH = os.path.join(ROOT_DIR, 'manifest.json')
UPDATES_XML_PATH = os.path.join(ROOT_DIR, 'updates.xml')
KEY_PATH = os.path.join(ROOT_DIR, 'scripts', 'zumpey_key.pem')
EXTENSION_ID = 'kopinfofnjnnihlnleibiaiofcpldcpm'

CHROME_PATHS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
]

def get_chrome_executable():
    for p in CHROME_PATHS:
        if os.path.exists(p):
            return p
    return None

def build_release():
    print('[Zumpey.com] Starting Release & CRX Packaging...')
    
    # 1. Read manifest version
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version', '1.0.3')
    print(f'[Zumpey.com] Release Version: v{version}')

    os.makedirs(DIST_DIR, exist_ok=True)
    zip_output_path = os.path.join(DIST_DIR, 'zumpey.zip')
    versioned_zip = os.path.join(DIST_DIR, f'zumpey-v{version}.zip')
    target_crx = os.path.join(DIST_DIR, 'zumpey.crx')
    versioned_crx = os.path.join(DIST_DIR, f'zumpey-v{version}.crx')

    # 2. Build ZIP Package
    include_dirs = ['icons', 'lib', 'src']
    include_files = ['manifest.json', 'updates.xml', 'README.md', 'LICENSE']

    with zipfile.ZipFile(zip_output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_name in include_files:
            file_path = os.path.join(ROOT_DIR, file_name)
            if os.path.exists(file_path):
                zipf.write(file_path, arcname=file_name)

        for dir_name in include_dirs:
            dir_path = os.path.join(ROOT_DIR, dir_name)
            if os.path.exists(dir_path):
                for root, _, files in os.walk(dir_path):
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, ROOT_DIR)
                        zipf.write(full_path, arcname=rel_path)

    shutil.copyfile(zip_output_path, versioned_zip)
    print(f'  [ZIP] Packaged: {zip_output_path} ({os.path.getsize(zip_output_path)} bytes)')

    # 3. Build Signed CRX Package using Chrome and persistent RSA key
    chrome_bin = get_chrome_executable()
    if chrome_bin and os.path.exists(KEY_PATH):
        temp_stage = tempfile.mkdtemp(prefix='zumpey_stage_')
        try:
            for item in include_files:
                p = os.path.join(ROOT_DIR, item)
                if os.path.exists(p):
                    shutil.copy2(p, os.path.join(temp_stage, item))

            for d in include_dirs:
                p = os.path.join(ROOT_DIR, d)
                if os.path.exists(p):
                    shutil.copytree(p, os.path.join(temp_stage, d))

            cmd = [chrome_bin, f'--pack-extension={temp_stage}', f'--pack-extension-key={KEY_PATH}']
            subprocess.run(cmd, capture_output=True, check=True)

            gen_crx = temp_stage + '.crx'
            if os.path.exists(gen_crx):
                shutil.copyfile(gen_crx, target_crx)
                shutil.copyfile(gen_crx, versioned_crx)
                print(f'  [CRX] Packaged Signed CRX: {target_crx} ({os.path.getsize(target_crx)} bytes)')
        except Exception as e:
            print(f'  [CRX Warning] Could not pack CRX with Chrome CLI: {e}')
        finally:
            shutil.rmtree(temp_stage, ignore_errors=True)

    # 4. Sync updates.xml
    xml_content = f"""<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='{EXTENSION_ID}'>
    <updatecheck codebase='https://raw.githubusercontent.com/shaharyarpk2/zumpey-pinterest-downloader/main/dist/zumpey.crx' version='{version}' />
  </app>
</gupdate>
"""
    with open(UPDATES_XML_PATH, 'w', encoding='utf-8') as f:
        f.write(xml_content.strip() + '\n')
    print(f'  [XML] Synced updates.xml to version {version} with appid {EXTENSION_ID}')

    print('\n[Zumpey.com] Release & CRX Packaging Complete! Ready to distribute.')

if __name__ == '__main__':
    build_release()
