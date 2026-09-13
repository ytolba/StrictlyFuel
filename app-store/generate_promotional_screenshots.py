from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-store" / "screenshots-6.9-inch-v2"
BACKGROUND = ROOT / "app-store" / "source-material" / "forest-topography.png"
ICON = ROOT / "assets" / "icon.png"

WIDTH, HEIGHT = 1284, 2778
FOREST = "#092A1C"
CREAM = "#F7EED9"
LIME = "#DDF260"
MUTED = "#C4BBA9"
OUTLINE = "#396B50"

FONT_BOLD = ROOT / "node_modules" / "expo-dev-menu" / "android" / "src" / "main" / "res" / "font" / "inter_bold.ttf"
FONT_MEDIUM = ROOT / "node_modules" / "expo-dev-menu" / "android" / "src" / "main" / "res" / "font" / "inter_semibold.ttf"
FONT_REGULAR = ROOT / "node_modules" / "expo-dev-menu" / "android" / "src" / "main" / "res" / "font" / "inter_regular.ttf"
FONT_MONO = ROOT / "node_modules" / "expo-dev-menu" / "android" / "src" / "main" / "res" / "font" / "jetbrains_mono_medium.ttf"


SLIDES = [
    {
        "file": "01-personal-fuel-target.png",
        "source": "/Users/yaseentolba/Downloads/IMG_8694.PNG",
        "kicker": "PERSONALIZED PRE-WORKOUT FUEL",
        "headline": "Know exactly how to fuel.",
        "subhead": "Carb targets built around your workout, body and timing.",
        "crop": (0, 120, 1206, 1600),
        "metrics": (("75G", "CARB TARGET"), ("1 HR", "RUN"), ("90 MIN", "TO DIGEST")),
    },
    {
        "file": "02-scan-and-score.png",
        "source": "/Users/yaseentolba/Downloads/IMG_8697.PNG",
        "kicker": "CAMERA MEAL ANALYSIS",
        "headline": "Scan your meal. See the fit.",
        "subhead": "Estimate foods and portions, then score the meal for this session.",
    },
    {
        "file": "03-real-meals-scaled-to-you.png",
        "source": "/Users/yaseentolba/Downloads/IMG_8695.PNG",
        "kicker": "REAL FOOD. YOUR TARGET.",
        "headline": "Meals scaled to you.",
        "subhead": "Practical options with portions and the best time to eat.",
    },
    {
        "file": "04-plan-in-under-a-minute.png",
        "source": "/Users/yaseentolba/Downloads/IMG_8692.PNG",
        "kicker": "FAST WORKOUT SETUP",
        "headline": "From workout to food in seconds.",
        "subhead": "Choose the session, intensity and start time. Strictly handles the rest.",
    },
    {
        "file": "05-recovery-built-from-training.png",
        "source": "/Users/yaseentolba/Downloads/IMG_8699.PNG",
        "kicker": "POST-WORKOUT RECOVERY",
        "headline": "Recover from the work you did.",
        "subhead": "Get recovery macros and complete meals after demanding sessions.",
    },
    {
        "file": "06-race-day-fueling.png",
        "source": "/Users/yaseentolba/Downloads/IMG_8700.PNG",
        "kicker": "RACE MODE",
        "headline": "Race-day fueling, made packable.",
        "subhead": "Turn finish time and carb tolerance into a plan you can practice.",
    },
]


def font(path: Path, size: int):
    return ImageFont.truetype(str(path), size=size)


def fit_cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def rounded(image: Image.Image, radius: int) -> Image.Image:
    rgba = image.convert("RGBA")
    mask = Image.new("L", rgba.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, rgba.width - 1, rgba.height - 1), radius=radius, fill=255)
    rgba.putalpha(mask)
    return rgba


def wrap_text(draw: ImageDraw.ImageDraw, text: str, typeface, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or draw.textbbox((0, 0), candidate, font=typeface)[2] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_tracking(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, typeface, fill: str, tracking: int):
    x, y = xy
    for character in text:
        draw.text((x, y), character, font=typeface, fill=fill)
        bounds = draw.textbbox((x, y), character, font=typeface)
        x = bounds[2] + tracking


def make_background() -> Image.Image:
    texture = fit_cover(Image.open(BACKGROUND).convert("RGB"), (WIDTH, HEIGHT))
    forest = Image.new("RGB", (WIDTH, HEIGHT), FOREST)
    base = Image.blend(texture, forest, 0.30)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((880, 40, 1430, 590), fill=(221, 242, 96, 40))
    glow_draw.ellipse((-300, 2050, 400, 2800), fill=(247, 238, 217, 18))
    return Image.alpha_composite(base.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(120)))


def add_brand(canvas: Image.Image, index: int):
    draw = ImageDraw.Draw(canvas)
    icon = rounded(Image.open(ICON).convert("RGB").resize((72, 72), Image.Resampling.LANCZOS), 17)
    canvas.alpha_composite(icon, (78, 72))
    draw_tracking(draw, (170, 86), "STRICTLYFUEL", font(FONT_MONO, 25), CREAM, 4)

    pill = (1070, 78, 1208, 136)
    draw.rounded_rectangle(pill, radius=29, fill=(5, 29, 20, 190), outline=OUTLINE, width=2)
    marker = f"{index:02d} / {len(SLIDES):02d}"
    marker_font = font(FONT_MONO, 18)
    marker_width = draw.textbbox((0, 0), marker, font=marker_font)[2]
    draw.text((pill[0] + (pill[2] - pill[0] - marker_width) / 2, 96), marker, font=marker_font, fill=MUTED)


def build_slide(slide: dict[str, str], index: int) -> Image.Image:
    canvas = make_background()
    draw = ImageDraw.Draw(canvas)
    add_brand(canvas, index)

    draw_tracking(draw, (78, 200), slide["kicker"], font(FONT_MONO, 22), LIME, 4)
    headline_font = font(FONT_BOLD, 94)
    headline_lines = wrap_text(draw, slide["headline"], headline_font, 1128)
    y = 245
    for line in headline_lines:
        draw.text((74, y), line, font=headline_font, fill=CREAM, stroke_width=1)
        y += 106

    sub_font = font(FONT_REGULAR, 35)
    sub_lines = wrap_text(draw, slide["subhead"], sub_font, 1085)
    sub_y = max(470, y + 12)
    for line in sub_lines:
        draw.text((78, sub_y), line, font=sub_font, fill=MUTED)
        sub_y += 48

    screenshot_y = max(690, sub_y + 58)
    screenshot_width = 1092
    source = Image.open(slide["source"]).convert("RGB")
    if slide.get("crop"):
        source = source.crop(slide["crop"])
    screenshot_height = round(source.height * screenshot_width / source.width)
    source = source.resize((screenshot_width, screenshot_height), Image.Resampling.LANCZOS)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    frame = (96, screenshot_y - 14, 1188, screenshot_y + screenshot_height + 14)
    shadow_draw.rounded_rectangle(frame, radius=66, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(42))
    canvas = Image.alpha_composite(canvas, shadow)

    card = rounded(source, 58)
    border = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border)
    border_draw.rounded_rectangle((92, screenshot_y - 4, 1192, screenshot_y + screenshot_height + 4), radius=64, fill=(57, 107, 80, 255))
    canvas = Image.alpha_composite(canvas, border)
    canvas.alpha_composite(card, (96, screenshot_y))

    if slide.get("metrics"):
        panel_top = min(2230, screenshot_y + screenshot_height + 92)
        panel = (96, panel_top, 1188, panel_top + 300)
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle(panel, radius=44, fill=(5, 29, 20, 220), outline=OUTLINE, width=3)
        column_width = (panel[2] - panel[0]) / 3
        for metric_index, (value, label) in enumerate(slide["metrics"]):
            center_x = panel[0] + column_width * (metric_index + 0.5)
            value_font = font(FONT_BOLD, 54)
            label_font = font(FONT_MONO, 17)
            value_width = draw.textbbox((0, 0), value, font=value_font)[2]
            label_width = draw.textbbox((0, 0), label, font=label_font)[2]
            draw.text((center_x - value_width / 2, panel_top + 75), value, font=value_font, fill=CREAM)
            draw.text((center_x - label_width / 2, panel_top + 154), label, font=label_font, fill=LIME)
            if metric_index < 2:
                line_x = panel[0] + column_width * (metric_index + 1)
                draw.line((line_x, panel_top + 62, line_x, panel_top + 238), fill=OUTLINE, width=2)

    return canvas.convert("RGB")


def make_contact_sheet(paths: list[Path]):
    thumb_width = 321
    thumb_height = round(HEIGHT * thumb_width / WIDTH)
    gap = 24
    sheet = Image.new("RGB", (thumb_width * 3 + gap * 4, thumb_height * 2 + gap * 3), "#061E15")
    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGB").resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        x = gap + (index % 3) * (thumb_width + gap)
        y = gap + (index // 3) * (thumb_height + gap)
        sheet.paste(image, (x, y))
    sheet.save(OUT / "contact-sheet.jpg", quality=92, subsampling=0)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, slide in enumerate(SLIDES, start=1):
        destination = OUT / slide["file"]
        build_slide(slide, index).save(destination, format="PNG", optimize=True)
        paths.append(destination)
    make_contact_sheet(paths)
    print("\n".join(str(path) for path in paths))


if __name__ == "__main__":
    main()
