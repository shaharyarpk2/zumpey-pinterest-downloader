"""
Zumpey.com: Ultra-High Quality Chrome Web Store Screenshots Generator (v2)
Generates 3 pixel-perfect, hyper-realistic, high-converting 1280x800 screenshots with drop shadows,
authentic Pinterest interface elements, and glassmorphic Zumpey.com toolbars.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'store_assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

WIDTH = 1280
HEIGHT = 800

def get_fonts():
    try:
        font_hero = ImageFont.truetype("arialbd.ttf", 36)
        font_sub = ImageFont.truetype("arial.ttf", 18)
        font_badge = ImageFont.truetype("arialbd.ttf", 14)
        font_btn = ImageFont.truetype("arialbd.ttf", 15)
        font_card_title = ImageFont.truetype("arialbd.ttf", 15)
        font_card_sub = ImageFont.truetype("arial.ttf", 13)
        font_table_head = ImageFont.truetype("arialbd.ttf", 13)
        font_table_cell = ImageFont.truetype("arial.ttf", 12)
        font_hud_title = ImageFont.truetype("arialbd.ttf", 22)
        font_hud_big = ImageFont.truetype("arialbd.ttf", 32)
        font_code = ImageFont.truetype("consola.ttf", 13)
    except Exception:
        font_hero = font_sub = font_badge = font_btn = font_card_title = font_card_sub = font_table_head = font_table_cell = font_hud_title = font_hud_big = font_code = ImageFont.load_default()
    
    return {
        "hero": font_hero,
        "sub": font_sub,
        "badge": font_badge,
        "btn": font_btn,
        "card_title": font_card_title,
        "card_sub": font_card_sub,
        "table_head": font_table_head,
        "table_cell": font_table_cell,
        "hud_title": font_hud_title,
        "hud_big": font_hud_big,
        "code": font_code
    }

def draw_shadowed_rounded_rect(base_img, xy, radius, fill, shadow_blur=16, shadow_offset=(0, 6), shadow_color=(0, 0, 0, 140), outline=None, outline_width=1):
    x1, y1 = xy[0]
    x2, y2 = xy[1]
    w = x2 - x1
    h = y2 - y1

    # Shadow layer
    shadow_img = Image.new('RGBA', (w + shadow_blur * 4, h + shadow_blur * 4), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_img)
    sdraw.rounded_rectangle([(shadow_blur * 2, shadow_blur * 2), (shadow_blur * 2 + w, shadow_blur * 2 + h)], radius=radius, fill=shadow_color)
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(shadow_blur))

    # Paste shadow
    sx = x1 - shadow_blur * 2 + shadow_offset[0]
    sy = y1 - shadow_blur * 2 + shadow_offset[1]
    base_img.paste(shadow_img, (sx, sy), shadow_img)

    # Draw actual rounded rectangle
    draw = ImageDraw.Draw(base_img)
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=outline_width)

def create_rich_gradient_card(w, h, color_theme, title, media_type):
    # Generates a realistic mock photography aesthetic card
    card = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)

    c1, c2 = color_theme
    for y in range(h - 70):
        t = y / (h - 70)
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # Bottom metadata bar
    draw.rectangle([(0, h - 70), (w, h)], fill=(24, 27, 38, 255))
    return card

def generate_screenshot_1():
    fonts = get_fonts()
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(10, 12, 18))
    draw = ImageDraw.Draw(img)

    # Background ambient radial glow
    for r in range(400, 0, -20):
        alpha = int(40 * (r / 400))
        draw.ellipse([(WIDTH // 2 - r, 200 - r), (WIDTH // 2 + r, 200 + r)], fill=(230, 0, 35, alpha))

    # Header Title Banner
    draw.text((60, 32), "⚡ 1-Click Pinterest Batch Extractor & Downloader", fill=(255, 255, 255), font=fonts["hero"])
    draw.text((64, 76), "Auto-Harvest Full Accounts & Boards in Full HD Original Images & 1080p MP4 Video Streams", fill=(148, 163, 184), font=fonts["sub"])

    # Browser Frame Window
    frame_box = [(50, 120), (1230, 760)]
    draw_shadowed_rounded_rect(img, frame_box, radius=16, fill=(18, 21, 30), shadow_blur=24, outline=(40, 46, 65), outline_width=2)

    # Browser Tab Bar
    draw.rounded_rectangle([(50, 120), (1230, 165)], radius=16, fill=(24, 28, 40))
    draw.rectangle([(50, 150), (1230, 165)], fill=(24, 28, 40)) # Flat bottom
    # Mac / Chrome window dots
    draw.ellipse([(70, 138), (82, 150)], fill=(239, 68, 68))
    draw.ellipse([(90, 138), (102, 150)], fill=(245, 158, 11))
    draw.ellipse([(110, 138), (122, 150)], fill=(34, 197, 94))

    # Tab Pill
    draw.rounded_rectangle([(145, 128), (420, 165)], radius=8, fill=(18, 21, 30))
    draw.ellipse([(160, 140), (174, 154)], fill=(230, 0, 35))
    draw.text((182, 138), "📌 Pinterest — Modern Living Room Aesthetic", fill=(240, 243, 246), font=fonts["card_sub"])

    # Address / URL bar
    draw.rounded_rectangle([(65, 175), (1030, 208)], radius=8, fill=(12, 14, 22), outline=(35, 40, 58))
    draw.text((80, 183), "🔒 https://www.pinterest.com/interior_design/modern-aesthetic-living-room/", fill=(148, 163, 184), font=fonts["card_sub"])

    # Extension Active Badge in Toolbar
    draw.rounded_rectangle([(1045, 175), (1215, 208)], radius=8, fill=(230, 0, 35))
    draw.text((1060, 183), "⚡ Zumpey.com Active", fill=(255, 255, 255), font=fonts["badge"])

    # Pinterest Grid Cards (4 columns masonry)
    cards = [
        {"idx": "#01", "w": 265, "h": 380, "theme": ((45, 55, 75), (20, 25, 35)), "title": "Minimalist Loft Living Room", "type": "🎬 1080p MP4", "link": "boredpanda.com"},
        {"idx": "#02", "w": 265, "h": 340, "theme": ((60, 45, 50), (25, 18, 20)), "title": "Nordic Wood Kitchen Decor", "type": "🖼️ Originals", "link": "architecturaldigest.com"},
        {"idx": "#03", "w": 265, "h": 400, "theme": ((40, 60, 55), (15, 25, 22)), "title": "Velvet Armchair Studio 2026", "type": "🎬 1080p MP4", "link": "etsy.com/shop/decor"},
        {"idx": "#04", "w": 265, "h": 350, "theme": ((55, 50, 40), (22, 20, 15)), "title": "Boho Concrete Wall Suite", "type": "🖼️ Originals", "link": "dezeen.com"}
    ]

    start_x = 75
    start_y = 225
    gap = 22

    for i, c in enumerate(cards):
        cx = start_x + i * (c["w"] + gap)
        cy = start_y
        
        # Card Container
        draw_shadowed_rounded_rect(img, [(cx, cy), (cx + c["w"], cy + c["h"])], radius=12, fill=(24, 27, 38), shadow_blur=12, outline=(230, 0, 35), outline_width=2)

        # Inner Image Artwork
        draw.rounded_rectangle([(cx + 8, cy + 8), (cx + c["w"] - 8, cy + c["h"] - 80)], radius=8, fill=c["theme"][0])

        # #01 Sequence Badge (Top-Left)
        draw.rounded_rectangle([(cx + 16, cy + 16), (cx + 68, cy + 46)], radius=6, fill=(230, 0, 35))
        draw.text((cx + 25, cy + 22), c["idx"], fill=(255, 255, 255), font=fonts["badge"])

        # Media Type Pill (Top-Right)
        pill_w = 105 if "MP4" in c["type"] else 95
        draw.rounded_rectangle([(cx + c["w"] - pill_w - 16, cy + 16), (cx + c["w"] - 16, cy + 46)], radius=6, fill=(12, 14, 22))
        draw.text((cx + c["w"] - pill_w - 8, cy + 22), c["type"], fill=(255, 255, 255), font=fonts["badge"])

        # Checkmark Badge (Bottom-Right of image)
        draw.ellipse([(cx + c["w"] - 42, cy + c["h"] - 120), (cx + c["w"] - 16, cy + c["h"] - 94)], fill=(34, 197, 94))
        draw.text((cx + c["w"] - 34, cy + c["h"] - 116), "✓", fill=(255, 255, 255), font=fonts["badge"])

        # Title & Destination Website inside card bottom
        draw.text((cx + 14, cy + c["h"] - 70), c["title"], fill=(248, 250, 252), font=fonts["card_title"])
        draw.text((cx + 14, cy + c["h"] - 45), f"🔗 {c['link']}", fill=(99, 102, 241), font=fonts["card_sub"])
        draw.text((cx + 14, cy + c["h"] - 25), "✓ Selected for Batch Download", fill=(34, 197, 94), font=fonts["table_cell"])

    # Bottom Floating Dock
    dock_w = 880
    dock_h = 66
    dock_x = (WIDTH - dock_w) // 2
    dock_y = 660

    draw_shadowed_rounded_rect(img, [(dock_x, dock_y), (dock_x + dock_w, dock_y + dock_h)], radius=33, fill=(14, 16, 25), shadow_blur=28, outline=(230, 0, 35), outline_width=2)

    # Dock Button 1: Fetch Full Board
    draw.rounded_rectangle([(dock_x + 18, dock_y + 10), (dock_x + 240, dock_y + 56)], radius=23, fill=(28, 33, 48), outline=(45, 52, 75))
    draw.text((dock_x + 40, dock_y + 22), "📥 Fetch Full Board", fill=(248, 250, 252), font=fonts["btn"])

    # Dock Button 2: Download Batch (Primary Action)
    draw.rounded_rectangle([(dock_x + 255, dock_y + 10), (dock_x + 580, dock_y + 56)], radius=23, fill=(230, 0, 35))
    draw.text((dock_x + 285, dock_y + 22), "🚀 Download Batch (48 Items)", fill=(255, 255, 255), font=fonts["btn"])

    # Dock Button 3: Export links.xlsx
    draw.rounded_rectangle([(dock_x + 595, dock_y + 10), (dock_x + 860, dock_y + 56)], radius=23, fill=(28, 33, 48), outline=(34, 197, 94))
    draw.text((dock_x + 625, dock_y + 22), "📊 Export links.xlsx", fill=(34, 197, 94), font=fonts["btn"])

    out_path = os.path.join(ASSETS_DIR, 'cws_screenshot_1.png')
    img.save(out_path, "PNG")
    print("Generated Screenshot 1:", out_path)

def generate_screenshot_2():
    fonts = get_fonts()
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(10, 12, 18))
    draw = ImageDraw.Draw(img)

    # Ambient Glow
    for r in range(450, 0, -25):
        alpha = int(45 * (r / 450))
        draw.ellipse([(WIDTH // 2 - r, 300 - r), (WIDTH // 2 + r, 300 + r)], fill=(230, 0, 35, alpha))

    # Header Title Banner
    draw.text((60, 32), "🎮 Real-Time Download HUD & Control Deck", fill=(255, 255, 255), font=fonts["hero"])
    draw.text((64, 76), "Interactive Glassmorphic Modal with Live Percentages, ⏸ Pause, ▶ Resume & ⏹ Cancel Buttons", fill=(148, 163, 184), font=fonts["sub"])

    # Center Glassmorphic Modal Box
    modal_w = 820
    modal_h = 560
    modal_x = (WIDTH - modal_w) // 2
    modal_y = 140

    draw_shadowed_rounded_rect(img, [(modal_x, modal_y), (modal_x + modal_w, modal_y + modal_h)], radius=20, fill=(18, 22, 34), shadow_blur=32, outline=(230, 0, 35), outline_width=2)

    # Modal Header Brand
    draw.rounded_rectangle([(modal_x + 35, modal_y + 30), (modal_x + 72, modal_y + 67)], radius=8, fill=(230, 0, 35))
    draw.text((modal_x + 45, modal_y + 34), "Z", fill=(255, 255, 255), font=fonts["hud_title"])
    draw.text((modal_x + 85, modal_y + 32), "Zumpey.com — Live Batch Download Queue", fill=(255, 255, 255), font=fonts["hud_title"])
    draw.text((modal_x + 85, modal_y + 60), "Batch Folder: Zumpey_Exports/2026-08-28_Modern_Living_Room/ (48 Pins)", fill=(148, 163, 184), font=fonts["card_sub"])

    # Metrics 3-Card Grid
    cards_data = [
        {"label": "Downloaded Items", "val": "36 / 48", "color": (34, 197, 94), "sub": "1080p MP4 + Original HD"},
        {"label": "Queue Progress", "val": "75%", "color": (230, 0, 35), "sub": "High-Speed Stream Engine"},
        {"label": "Package Format", "val": "1-Click ZIP", "color": (99, 102, 241), "sub": "Single Clean Archive"}
    ]

    card_w = 230
    card_h = 105
    start_cx = modal_x + 35
    for i, c in enumerate(cards_data):
        cx = start_cx + i * (card_w + 30)
        cy = modal_y + 105
        draw.rounded_rectangle([(cx, cy), (cx + card_w, cy + card_h)], radius=12, fill=(25, 30, 46), outline=(45, 52, 78))
        draw.text((cx + 16, cy + 14), c["label"], fill=(148, 163, 184), font=fonts["card_sub"])
        draw.text((cx + 16, cy + 36), c["val"], fill=c["color"], font=fonts["hud_big"])
        draw.text((cx + 16, cy + 78), c["sub"], fill=(100, 116, 139), font=fonts["table_cell"])

    # Progress Bar Container
    bar_x = modal_x + 35
    bar_y = modal_y + 245
    bar_w = 750
    bar_h = 24
    draw.rounded_rectangle([(bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h)], radius=12, fill=(12, 14, 22))
    fill_w = int(bar_w * 0.75)
    draw.rounded_rectangle([(bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h)], radius=12, fill=(230, 0, 35))

    # Currently Downloading File Callout Box
    draw.rounded_rectangle([(modal_x + 35, modal_y + 295), (modal_x + 785, modal_y + 380)], radius=12, fill=(12, 14, 22), outline=(40, 46, 68))
    draw.text((modal_x + 55, modal_y + 312), "🎬 Active Stream: 037_Modern_Nordic_Kitchen_1080p.mp4", fill=(248, 250, 252), font=fonts["btn"])
    draw.text((modal_x + 55, modal_y + 338), "Target: https://v1.pinimg.com/videos/mc/1080p/modern_kitchen_feed.mp4 (14.6 MB)", fill=(148, 163, 184), font=fonts["card_sub"])
    draw.text((modal_x + 55, modal_y + 356), "Outbound Link: https://architecturaldigest.com/nordic-kitchen/ (Resolved & Added to links.xlsx)", fill=(34, 197, 94), font=fonts["table_cell"])

    # Interactive Action Buttons (Pause / Resume / Cancel)
    btn_y = modal_y + 415
    btn_w = 230
    btn_h = 54

    # 1. Pause Button
    draw.rounded_rectangle([(modal_x + 35, btn_y), (modal_x + 35 + btn_w, btn_y + btn_h)], radius=12, fill=(245, 158, 11))
    draw.text((modal_x + 95, btn_y + 16), "⏸ Pause Queue", fill=(0, 0, 0), font=fonts["btn"])

    # 2. Resume Button
    draw.rounded_rectangle([(modal_x + 295, btn_y), (modal_x + 295 + btn_w, btn_y + btn_h)], radius=12, fill=(34, 197, 94))
    draw.text((modal_x + 355, btn_y + 16), "▶ Resume", fill=(255, 255, 255), font=fonts["btn"])

    # 3. Cancel Button
    draw.rounded_rectangle([(modal_x + 555, btn_y), (modal_x + 555 + btn_w, btn_y + btn_h)], radius=12, fill=(239, 68, 68))
    draw.text((modal_x + 610, btn_y + 16), "⏹ Cancel Batch", fill=(255, 255, 255), font=fonts["btn"])

    # Bottom helper note
    draw.text((modal_x + 130, modal_y + 500), "✨ Control your downloads live at any second without losing completed items.", fill=(148, 163, 184), font=fonts["card_sub"])

    out_path = os.path.join(ASSETS_DIR, 'cws_screenshot_2.png')
    img.save(out_path, "PNG")
    print("Generated Screenshot 2:", out_path)

def generate_screenshot_3():
    fonts = get_fonts()
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(10, 12, 18))
    draw = ImageDraw.Draw(img)

    # Ambient Glow
    for r in range(400, 0, -20):
        alpha = int(35 * (r / 400))
        draw.ellipse([(900, 300 - r), (900 + r * 2, 300 + r)], fill=(34, 197, 94, alpha))

    # Header Title Banner
    draw.text((60, 32), "📊 Deep Outbound Website Link Extractor & Excel (.xlsx) Export", fill=(255, 255, 255), font=fonts["hero"])
    draw.text((64, 76), "Extract clean destination blogs, stores, and source URLs into structured spreadsheets automatically", fill=(148, 163, 184), font=fonts["sub"])

    # Excel Window Container
    sheet_w = 1160
    sheet_h = 580
    sheet_x = (WIDTH - sheet_w) // 2
    sheet_y = 135

    draw_shadowed_rounded_rect(img, [(sheet_x, sheet_y), (sheet_x + sheet_w, sheet_y + sheet_h)], radius=16, fill=(18, 22, 34), shadow_blur=28, outline=(34, 197, 94), outline_width=2)

    # Excel Header Ribbon
    draw.rounded_rectangle([(sheet_x, sheet_y), (sheet_x + sheet_w, sheet_y + 55)], radius=16, fill=(22, 101, 52))
    draw.rectangle([(sheet_x, sheet_y + 35), (sheet_x + sheet_w, sheet_y + 55)], fill=(22, 101, 52))
    draw.text((sheet_x + 25, sheet_y + 16), "📊 Microsoft Excel Export — links.xlsx (1-Click Batch Metadata Generation)", fill=(255, 255, 255), font=fonts["btn"])

    # Table Header Row
    cols = [
        ("Seq #", 80),
        ("File Name", 150),
        ("Media Type", 130),
        ("Outbound Destination Website Link", 380),
        ("Pin Title", 270),
        ("Download Status", 130)
    ]

    row_y = sheet_y + 65
    cur_x = sheet_x + 10
    for name, w in cols:
        draw.rectangle([(cur_x, row_y), (cur_x + w, row_y + 36)], fill=(28, 34, 52), outline=(45, 52, 75))
        draw.text((cur_x + 10, row_y + 10), name, fill=(248, 250, 252), font=fonts["table_head"])
        cur_x += w

    # Spreadsheet Data Rows
    rows_data = [
        ("001", "001.mp4", "Video (1080p)", "https://boredpanda.com/modern-home-decor/", "Minimalist Loft Living Room", "Downloaded"),
        ("002", "002.jpg", "Image (Originals)", "https://architecturaldigest.com/nordic-kitchen/", "Nordic Wood Kitchen Decor", "Downloaded"),
        ("003", "003.mp4", "Video (1080p)", "https://etsy.com/shop/luxury-velvet-chair/", "Velvet Armchair Studio 2026", "Downloaded"),
        ("004", "004.jpg", "Image (Originals)", "https://dezeen.com/architecture/concrete-loft/", "Boho Concrete Wall Suite", "Downloaded"),
        ("005", "005.jpg", "Image (Originals)", "https://amazon.com/dp/B09X987654/", "Scandinavian Pendant Lamp Design", "Downloaded"),
        ("006", "006.mp4", "Video (720p)", "https://thespruce.com/modern-plants-guide/", "Indoor Botanical Garden Tour", "Downloaded"),
        ("007", "007.jpg", "Image (Originals)", "https://ikea.com/us/en/p/modern-sofa-set/", "Modular Sectional Sofa Grey Velvet", "Downloaded"),
        ("008", "008.jpg", "Image (Originals)", "https://houzz.com/magazine/modern-bathroom/", "Marble Master Bathroom Luxury", "Downloaded")
    ]

    for r_idx, row in enumerate(rows_data):
        r_y = row_y + 36 + r_idx * 44
        c_x = sheet_x + 10
        row_bg = (24, 29, 44) if r_idx % 2 == 0 else (18, 22, 34)
        
        for c_idx, (val, col_w) in enumerate(zip(row, [80, 150, 130, 380, 270, 130])):
            draw.rectangle([(c_x, r_y), (c_x + col_w, r_y + 44)], fill=row_bg, outline=(38, 44, 66))
            
            if c_idx == 0:
                draw.text((c_x + 10, r_y + 14), val, fill=(230, 0, 35), font=fonts["code"])
            elif c_idx == 2:
                col = (245, 158, 11) if "Video" in val else (59, 130, 246)
                draw.text((c_x + 10, r_y + 14), val, fill=col, font=fonts["table_cell"])
            elif c_idx == 3:
                draw.text((c_x + 10, r_y + 14), val, fill=(34, 197, 94), font=fonts["table_cell"])
            elif c_idx == 5:
                draw.text((c_x + 10, r_y + 14), "✓ " + val, fill=(34, 197, 94), font=fonts["table_cell"])
            else:
                draw.text((c_x + 10, r_y + 14), val, fill=(248, 250, 252), font=fonts["table_cell"])
            
            c_x += col_w

    # Bottom Callout Summary
    draw.rounded_rectangle([(sheet_x + 20, sheet_y + sheet_h - 75), (sheet_x + sheet_w - 20, sheet_y + sheet_h - 18)], radius=10, fill=(12, 14, 22))
    draw.text((sheet_x + 40, sheet_y + sheet_h - 56), "✨ Deep Link Resolver extracts real outbound blogs/shops rather than internal Pinterest URLs directly into Excel (.xlsx).", fill=(148, 163, 184), font=fonts["card_sub"])

    out_path = os.path.join(ASSETS_DIR, 'cws_screenshot_3.png')
    img.save(out_path, "PNG")
    print("Generated Screenshot 3:", out_path)

if __name__ == '__main__':
    generate_screenshot_1()
    generate_screenshot_2()
    generate_screenshot_3()
    print("\nAll 3 Enhanced Chrome Web Store Screenshots Generated in store_assets/")
