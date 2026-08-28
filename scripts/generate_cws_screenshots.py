"""
Zumpey.com: Chrome Web Store Official Promotional Screenshot Generator
Generates 3 pristine 1280x800 24-bit PNG/JPEG screenshots with modern dark-mode aesthetic.
"""

import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'store_assets')
os.makedirs(ASSETS_DIR, exist_ok=True)

WIDTH = 1280
HEIGHT = 800

def get_fonts():
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 44)
        font_sub = ImageFont.truetype("arial.ttf", 22)
        font_badge = ImageFont.truetype("arialbd.ttf", 16)
        font_card_title = ImageFont.truetype("arialbd.ttf", 18)
        font_card_desc = ImageFont.truetype("arial.ttf", 14)
        font_code = ImageFont.truetype("consola.ttf", 15)
        font_hud_title = ImageFont.truetype("arialbd.ttf", 26)
        font_hud_stat = ImageFont.truetype("arialbd.ttf", 36)
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_card_title = ImageFont.load_default()
        font_card_desc = ImageFont.load_default()
        font_code = ImageFont.load_default()
        font_hud_title = ImageFont.load_default()
        font_hud_stat = ImageFont.load_default()
    
    return font_title, font_sub, font_badge, font_card_title, font_card_desc, font_code, font_hud_title, font_hud_stat

def create_base_canvas(title_text, subtitle_text):
    font_title, font_sub, _, _, _, _, _, _ = get_fonts()
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(13, 15, 23)) # Deep dark canvas #0d0f17
    draw = ImageDraw.Draw(img)

    # Top gradient glow effect
    for y in range(200):
        alpha = int(35 * (1 - y / 200))
        draw.line([(0, y), (WIDTH, y)], fill=(230, 0, 35, alpha))

    # Header Brand Icon
    draw.rounded_rectangle([(60, 42), (96, 78)], radius=10, fill=(230, 0, 35))
    draw.text((71, 46), "Z", fill=(255, 255, 255), font=font_title)

    # Header Titles
    draw.text((112, 38), title_text, fill=(248, 250, 252), font=font_title)
    draw.text((114, 88), subtitle_text, fill=(148, 163, 184), font=font_sub)

    return img, draw

def generate_screenshot_1():
    img, draw = create_base_canvas(
        "1-Click Pinterest Batch Extractor & Downloader",
        "Auto-Harvest Full Accounts & Boards in Full HD & 1080p MP4 Video"
    )
    _, _, font_badge, font_card_title, font_card_desc, _, _, _ = get_fonts()

    # Browser Mockup Container
    draw.rounded_rectangle([(60, 140), (1220, 750)], radius=16, fill=(20, 23, 34), outline=(45, 50, 70), width=2)

    # Browser Header bar
    draw.rectangle([(60, 140), (1220, 190)], fill=(26, 30, 44))
    # Window buttons
    draw.ellipse([(85, 160), (97, 172)], fill=(239, 68, 68))
    draw.ellipse([(105, 160), (117, 172)], fill=(245, 158, 11))
    draw.ellipse([(125, 160), (137, 172)], fill=(34, 197, 94))

    # Search / URL pill
    draw.rounded_rectangle([(160, 150), (960, 180)], radius=8, fill=(15, 18, 28))
    draw.text((180, 156), "https://www.pinterest.com/aesthetic_designs/modern-interior/", fill=(148, 163, 184), font=font_card_desc)

    # Extension active badge in toolbar
    draw.rounded_rectangle([(980, 150), (1200, 180)], radius=8, fill=(230, 0, 35))
    draw.text((995, 156), "⚡ Zumpey.com Active (48 Pins)", fill=(255, 255, 255), font=font_badge)

    # Grid of Pinterest Pin Cards
    card_w = 260
    card_h = 360
    start_x = 85
    start_y = 210
    gap = 25

    pins_data = [
        {"idx": "#01", "title": "Minimalist Loft Living Room", "type": "🎬 1080p MP4", "bg": (40, 50, 70), "link": "boredpanda.com"},
        {"idx": "#02", "title": "Nordic Wood Kitchen Decor", "type": "🖼️ Full HD", "bg": (50, 60, 55), "link": "architecturaldigest.com"},
        {"idx": "#03", "title": "Velvet Armchair Style 2026", "type": "🎬 1080p MP4", "bg": (65, 45, 60), "link": "etsy.com/shop/decor"},
        {"idx": "#04", "title": "Boho Concrete Wall Design", "type": "🖼️ Full HD", "bg": (60, 55, 45), "link": "dezeen.com"}
    ]

    for i, pin in enumerate(pins_data):
        cx = start_x + i * (card_w + gap)
        cy = start_y

        # Pin Card Body
        draw.rounded_rectangle([(cx, cy), (cx + card_w, cy + card_h)], radius=12, fill=pin["bg"], outline=(230, 0, 35, 180), width=2)

        # Image placeholder gradient
        draw.rounded_rectangle([(cx + 10, cy + 10), (cx + card_w - 10, cy + 240)], radius=8, fill=(25, 28, 40))

        # Top Numbered Index Badge (#01, #02...)
        draw.rounded_rectangle([(cx + 18, cy + 18), (cx + 65, cy + 46)], radius=6, fill=(230, 0, 35))
        draw.text((cx + 26, cy + 22), pin["idx"], fill=(255, 255, 255), font=font_badge)

        # Media Type Pill (1080p MP4 or Full HD)
        pill_w = 110 if "MP4" in pin["type"] else 95
        draw.rounded_rectangle([(cx + card_w - pill_w - 18, cy + 18), (cx + card_w - 18, cy + 46)], radius=6, fill=(15, 18, 28))
        draw.text((cx + card_w - pill_w - 10, cy + 22), pin["type"], fill=(248, 250, 252), font=font_badge)

        # Title and Outbound Link inside card
        draw.text((cx + 14, cy + 255), pin["title"], fill=(255, 255, 255), font=font_card_title)
        draw.text((cx + 14, cy + 285), f"🔗 {pin['link']}", fill=(99, 102, 241), font=font_card_desc)
        draw.text((cx + 14, cy + 315), "✓ Selected for Batch Download", fill=(34, 197, 94), font=font_card_desc)

    # Floating Bottom Action Dock
    dock_w = 880
    dock_h = 70
    dock_x = (WIDTH - dock_w) // 2
    dock_y = 650

    draw.rounded_rectangle([(dock_x, dock_y), (dock_x + dock_w, dock_y + dock_h)], radius=35, fill=(15, 18, 28), outline=(230, 0, 35), width=2)
    
    # Dock buttons
    draw.rounded_rectangle([(dock_x + 20, dock_y + 12), (dock_x + 260, dock_y + 58)], radius=23, fill=(35, 40, 58))
    draw.text((dock_x + 40, dock_y + 24), "📥 Fetch Full Board", fill=(248, 250, 252), font=font_badge)

    draw.rounded_rectangle([(dock_x + 280, dock_y + 12), (dock_x + 590, dock_y + 58)], radius=23, fill=(230, 0, 35))
    draw.text((dock_x + 310, dock_y + 24), "🚀 Download Batch (48 Pins)", fill=(255, 255, 255), font=font_badge)

    draw.rounded_rectangle([(dock_x + 610, dock_y + 12), (dock_x + 860, dock_y + 58)], radius=23, fill=(35, 40, 58))
    draw.text((dock_x + 635, dock_y + 24), "📊 Export links.xlsx", fill=(34, 197, 94), font=font_badge)

    output_path = os.path.join(ASSETS_DIR, 'cws_screenshot_1.png')
    img.save(output_path, "PNG")
    print("Generated:", output_path)

def generate_screenshot_2():
    img, draw = create_base_canvas(
        "Interactive Download HUD & Real-Time Controls",
        "Live Progress Modal with ⏸ Pause, ▶ Resume & ⏹ Cancel Buttons"
    )
    _, _, font_badge, font_card_title, font_card_desc, _, font_hud_title, font_hud_stat = get_fonts()

    # Center Glassmorphic Modal Box
    modal_w = 760
    modal_h = 480
    modal_x = (WIDTH - modal_w) // 2
    modal_y = 180

    draw.rounded_rectangle([(modal_x, modal_y), (modal_x + modal_w, modal_y + modal_h)], radius=20, fill=(20, 24, 38), outline=(230, 0, 35), width=2)

    # Modal Header
    draw.text((modal_x + 40, modal_y + 35), "⚡ Zumpey.com — Batch Download in Progress", fill=(255, 255, 255), font=font_hud_title)
    draw.text((modal_x + 40, modal_y + 75), "Saving high-resolution images & 1080p MP4 videos to dedicated folder...", fill=(148, 163, 184), font=font_card_desc)

    # Metric Cards Grid
    # Card 1: Completed
    draw.rounded_rectangle([(modal_x + 40, modal_y + 115), (modal_x + 250, modal_y + 205)], radius=12, fill=(28, 33, 50), outline=(45, 50, 75))
    draw.text((modal_x + 55, modal_y + 128), "Completed", fill=(148, 163, 184), font=font_card_desc)
    draw.text((modal_x + 55, modal_y + 150), "38 / 50", fill=(34, 197, 94), font=font_hud_stat)

    # Card 2: Progress
    draw.rounded_rectangle([(modal_x + 275, modal_y + 115), (modal_x + 485, modal_y + 205)], radius=12, fill=(28, 33, 50), outline=(45, 50, 75))
    draw.text((modal_x + 290, modal_y + 128), "Progress Percentage", fill=(148, 163, 184), font=font_card_desc)
    draw.text((modal_x + 290, modal_y + 150), "76%", fill=(230, 0, 35), font=font_hud_stat)

    # Card 3: Mode
    draw.rounded_rectangle([(modal_x + 510, modal_y + 115), (modal_x + 720, modal_y + 205)], radius=12, fill=(28, 33, 50), outline=(45, 50, 75))
    draw.text((modal_x + 525, modal_y + 128), "Package Format", fill=(148, 163, 184), font=font_card_desc)
    draw.text((modal_x + 525, modal_y + 152), "1-Click ZIP", fill=(99, 102, 241), font=font_card_title)

    # Progress Bar Background
    bar_x = modal_x + 40
    bar_y = modal_y + 235
    bar_w = 680
    bar_h = 22
    draw.rounded_rectangle([(bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h)], radius=11, fill=(15, 18, 28))
    # Active Progress Fill (76%)
    fill_w = int(bar_w * 0.76)
    draw.rounded_rectangle([(bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h)], radius=11, fill=(230, 0, 35))

    # Currently processing file banner
    draw.rounded_rectangle([(modal_x + 40, modal_y + 285), (modal_x + 720, modal_y + 345)], radius=10, fill=(15, 18, 28))
    draw.text((modal_x + 55, modal_y + 298), "🎬 Downloading: 039_Minimalist_Modern_Kitchen_1080p.mp4", fill=(248, 250, 252), font=font_card_title)
    draw.text((modal_x + 55, modal_y + 322), "Resolved progressive 1080p stream with stereo audio (14.2 MB)", fill=(148, 163, 184), font=font_card_desc)

    # Interactive Action Buttons (Pause / Resume / Cancel)
    btn_y = modal_y + 380
    # Pause Button
    draw.rounded_rectangle([(modal_x + 40, btn_y), (modal_x + 250, btn_y + 60)], radius=12, fill=(245, 158, 11))
    draw.text((modal_x + 95, btn_y + 18), "⏸ Pause", fill=(0, 0, 0), font=font_card_title)

    # Resume Button
    draw.rounded_rectangle([(modal_x + 275, btn_y), (modal_x + 485, btn_y + 60)], radius=12, fill=(34, 197, 94))
    draw.text((modal_x + 325, btn_y + 18), "▶ Resume", fill=(255, 255, 255), font=font_card_title)

    # Cancel Button
    draw.rounded_rectangle([(modal_x + 510, btn_y), (modal_x + 720, btn_y + 60)], radius=12, fill=(239, 68, 68))
    draw.text((modal_x + 565, btn_y + 18), "⏹ Cancel", fill=(255, 255, 255), font=font_card_title)

    output_path = os.path.join(ASSETS_DIR, 'cws_screenshot_2.png')
    img.save(output_path, "PNG")
    print("Generated:", output_path)

def generate_screenshot_3():
    img, draw = create_base_canvas(
        "Excel (.xlsx) / CSV Metadata & Outbound Destination Links",
        "Generate Structured Spreadsheets with Clean Target Website URLs"
    )
    _, _, font_badge, font_card_title, font_card_desc, font_code, _, _ = get_fonts()

    # Excel Spreadsheet Preview Window
    sheet_w = 1120
    sheet_h = 560
    sheet_x = (WIDTH - sheet_w) // 2
    sheet_y = 160

    draw.rounded_rectangle([(sheet_x, sheet_y), (sheet_x + sheet_w, sheet_y + sheet_h)], radius=16, fill=(20, 24, 38), outline=(34, 197, 94), width=2)

    # Spreadsheet Header
    draw.rounded_rectangle([(sheet_x, sheet_y), (sheet_x + sheet_w, sheet_y + 55)], radius=16, fill=(22, 101, 52))
    draw.text((sheet_x + 30, sheet_y + 16), "📊 Excel Export Preview — links.xlsx (Generated Automatically with Batch)", fill=(255, 255, 255), font=font_card_title)

    # Columns Header Row
    cols = [
        ("Seq #", 80),
        ("File Name", 180),
        ("Media Type", 140),
        ("Outbound Destination Website", 320),
        ("Pin Title", 240),
        ("Status", 100)
    ]

    row_y = sheet_y + 65
    cur_x = sheet_x + 20
    for name, w in cols:
        draw.rectangle([(cur_x, row_y), (cur_x + w, row_y + 35)], fill=(30, 36, 56), outline=(45, 52, 78))
        draw.text((cur_x + 10, row_y + 8), name, fill=(248, 250, 252), font=font_card_desc)
        cur_x += w

    # Spreadsheet Data Rows
    rows_data = [
        ("001", "001.mp4", "Video (1080p)", "https://boredpanda.com/modern-home-decor/", "Minimalist Loft Living Room", "Downloaded"),
        ("002", "002.jpg", "Image (HD)", "https://architecturaldigest.com/nordic-kitchen/", "Nordic Wood Kitchen Decor", "Downloaded"),
        ("003", "003.mp4", "Video (1080p)", "https://etsy.com/shop/luxury-velvet-chair/", "Velvet Armchair Style 2026", "Downloaded"),
        ("004", "004.jpg", "Image (HD)", "https://dezeen.com/architecture/concrete-loft/", "Boho Concrete Wall Design", "Downloaded"),
        ("005", "005.jpg", "Image (HD)", "https://amazon.com/dp/B09X987654/", "Scandinavian Pendant Lamp", "Downloaded"),
        ("006", "006.mp4", "Video (720p)", "https://thespruce.com/modern-plants-guide/", "Indoor Botanical Garden Tour", "Downloaded"),
        ("007", "007.jpg", "Image (HD)", "https://ikea.com/us/en/p/modern-sofa-set/", "Modular Sectional Sofa Grey", "Downloaded")
    ]

    for r_idx, row in enumerate(rows_data):
        r_y = row_y + 40 + r_idx * 44
        c_x = sheet_x + 20
        row_bg = (25, 30, 48) if r_idx % 2 == 0 else (20, 24, 38)
        
        for c_idx, (val, col_w) in enumerate(zip(row, [80, 180, 140, 320, 240, 100])):
            draw.rectangle([(c_x, r_y), (c_x + col_w, r_y + 40)], fill=row_bg, outline=(40, 46, 70))
            
            # Color code values
            if c_idx == 0:
                draw.text((c_x + 10, r_y + 12), val, fill=(230, 0, 35), font=font_code)
            elif c_idx == 2:
                col = (245, 158, 11) if "Video" in val else (59, 130, 246)
                draw.text((c_x + 10, r_y + 12), val, fill=col, font=font_card_desc)
            elif c_idx == 3:
                draw.text((c_x + 10, r_y + 12), val, fill=(34, 197, 94), font=font_card_desc)
            elif c_idx == 5:
                draw.text((c_x + 10, r_y + 12), "✓ " + val, fill=(34, 197, 94), font=font_card_desc)
            else:
                draw.text((c_x + 10, r_y + 12), val, fill=(248, 250, 252), font=font_card_desc)
            
            c_x += col_w

    # Bottom Callout Badge
    draw.rounded_rectangle([(sheet_x + 30, sheet_y + sheet_h - 70), (sheet_x + sheet_w - 30, sheet_y + sheet_h - 20)], radius=10, fill=(15, 18, 28))
    draw.text((sheet_x + 50, sheet_y + sheet_h - 55), "✨ All extracted outbound destination URLs are automatically resolved and verified directly into Excel.", fill=(148, 163, 184), font=font_card_desc)

    output_path = os.path.join(ASSETS_DIR, 'cws_screenshot_3.png')
    img.save(output_path, "PNG")
    print("Generated:", output_path)

if __name__ == '__main__':
    generate_screenshot_1()
    generate_screenshot_2()
    generate_screenshot_3()
    print("\nAll 3 Chrome Web Store 1280x800 screenshots generated successfully in store_assets/")
