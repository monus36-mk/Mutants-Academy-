import os
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

input_path = '/Users/monuskumar/Downloads/untitled folder 2/ai imgs/Gemini_Generated_Image_1cwa0f1cwa0f1cwa.png'
public_dir = '/Users/monuskumar/Downloads/anti gravity/mutants DB/public'
icons_dir = os.path.join(public_dir, 'icons')
os.makedirs(icons_dir, exist_ok=True)

im = Image.open(input_path).convert('RGBA')
arr = np.array(im, dtype=np.float32)
h, w, _ = arr.shape

r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
brightness = (r + g + b) / 3.0
color_diff = np.maximum(np.maximum(np.abs(r - g), np.abs(r - b)), np.abs(g - b))

# Background candidate condition
is_bg_candidate = (brightness > 230) & (color_diff < 28)

# Flood fill from image borders (all 4 edges) to ONLY remove exterior background
visited = np.zeros((h, w), dtype=bool)
queue = deque()

for x in range(w):
    if is_bg_candidate[0, x]:
        queue.append((0, x))
        visited[0, x] = True
    if is_bg_candidate[h - 1, x]:
        queue.append((h - 1, x))
        visited[h - 1, x] = True

for y in range(h):
    if is_bg_candidate[y, 0] and not visited[y, 0]:
        queue.append((y, 0))
        visited[y, 0] = True
    if is_bg_candidate[y, w - 1] and not visited[y, w - 1]:
        queue.append((y, w - 1))
        visited[y, w - 1] = True

while queue:
    cy, cx = queue.popleft()
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
        ny, nx = cy + dy, cx + dx
        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
            if is_bg_candidate[ny, nx]:
                visited[ny, nx] = True
                queue.append((ny, nx))

# Create alpha channel
new_alpha = np.where(visited, 0.0, 255.0)

# Smooth edges for transition pixels near boundary
for y in range(1, h - 1):
    for x in range(1, w - 1):
        if not visited[y, x]:
            # check if adjacent to visited
            has_bg_neighbor = (
                visited[y - 1, x]
                or visited[y + 1, x]
                or visited[y, x - 1]
                or visited[y, x + 1]
            )
            if has_bg_neighbor and brightness[y, x] > 210:
                # Feather alpha based on brightness
                factor = max(0.0, min(1.0, (255.0 - brightness[y, x]) / 45.0))
                new_alpha[y, x] = factor * 255.0

result_arr = np.dstack((arr[:, :, :3], new_alpha)).astype(np.uint8)
transparent_im = Image.fromarray(result_arr, 'RGBA')

# Crop to non-transparent bounding box
bbox = transparent_im.getbbox()
if bbox:
    # Add 12px padding
    pad = 12
    crop_box = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(w, bbox[2] + pad),
        min(h, bbox[3] + pad),
    )
    cropped_logo = transparent_im.crop(crop_box)
else:
    cropped_logo = transparent_im

# 1. Save Master Logo PNG
master_logo_path = os.path.join(public_dir, 'logo.png')
cropped_logo.save(master_logo_path, 'PNG', optimize=True)
print(f'Saved master transparent logo to {master_logo_path} size: {cropped_logo.size}')

# Function to create centered square icon with transparent background
def make_square_icon(image, target_size, padding_ratio=0.08):
    icon_canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
    usable_size = int(target_size * (1.0 - 2 * padding_ratio))

    img_w, img_h = image.size
    scale = min(usable_size / img_w, usable_size / img_h)
    new_w = int(img_w * scale)
    new_h = int(img_h * scale)

    resized = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    pos_x = (target_size - new_w) // 2
    pos_y = (target_size - new_h) // 2

    icon_canvas.paste(resized, (pos_x, pos_y), resized)
    return icon_canvas

# 2. Generate PWA App Icons (Transparent PNGs)
icon_192 = make_square_icon(cropped_logo, 192, padding_ratio=0.05)
icon_192.save(os.path.join(icons_dir, 'icon-192.png'), 'PNG', optimize=True)

icon_512 = make_square_icon(cropped_logo, 512, padding_ratio=0.05)
icon_512.save(os.path.join(icons_dir, 'icon-512.png'), 'PNG', optimize=True)

maskable_512 = make_square_icon(cropped_logo, 512, padding_ratio=0.15)
maskable_512.save(os.path.join(icons_dir, 'maskable-icon-512.png'), 'PNG', optimize=True)

apple_icon = make_square_icon(cropped_logo, 180, padding_ratio=0.05)
apple_icon.save(os.path.join(icons_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)

# Also create favicon
favicon_img = make_square_icon(cropped_logo, 64, padding_ratio=0.02)
favicon_img.save(os.path.join(public_dir, 'favicon.ico'), format='ICO')
favicon_img.save(os.path.join(public_dir, 'favicon.png'), format='PNG')

print('All transparent PWA and website logo icons generated successfully!')
