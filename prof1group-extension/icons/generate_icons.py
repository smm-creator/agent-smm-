"""Generate PNG icons for the Chrome extension using only Python stdlib."""
import struct
import zlib
import os

def create_png(size, r, g, b):
    """Create a solid-color square PNG."""
    width = height = size
    
    # Image data: raw RGB pixels
    raw_rows = []
    for y in range(height):
        row = bytes([0])  # filter type: None
        for x in range(width):
            # Draw a rounded-feel icon with a gradient effect
            cx = x - width / 2
            cy = y - height / 2
            dist = (cx**2 + cy**2) ** 0.5
            max_dist = (width / 2) * 1.4
            
            # Background
            pr, pg, pb = r, g, b
            
            # Outer border fade
            if dist > width * 0.45:
                factor = max(0, 1 - (dist - width * 0.45) / (width * 0.1))
                pr = int(pr * factor + 255 * (1 - factor))
                pg = int(pg * factor + 255 * (1 - factor))
                pb = int(pb * factor + 255 * (1 - factor))
            
            row += bytes([pr, pg, pb, 255])
        raw_rows.append(row)
    
    raw_data = b''.join(raw_rows)
    compressed = zlib.compress(raw_data, 9)
    
    def chunk(name, data):
        c = name + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend


def draw_icon(size, bg_r, bg_g, bg_b):
    """Create a more detailed icon with 'P1' text-like pattern."""
    width = height = size
    pixels = [[(bg_r, bg_g, bg_b, 255)] * width for _ in range(height)]
    
    # Draw rounded rectangle background
    for y in range(height):
        for x in range(width):
            cx = x - width / 2 + 0.5
            cy = y - height / 2 + 0.5
            
            # Rounded corners
            radius = width * 0.18
            corner_r = width * 0.22
            
            in_rect = (abs(cx) <= width / 2 - 1 and abs(cy) <= height / 2 - 1)
            
            if in_rect:
                ax, ay = abs(cx), abs(cy)
                in_corner = (ax > width / 2 - corner_r - 1 and ay > height / 2 - corner_r - 1)
                
                if in_corner:
                    dx = ax - (width / 2 - corner_r - 1)
                    dy = ay - (height / 2 - corner_r - 1)
                    if (dx**2 + dy**2) > corner_r**2:
                        pixels[y][x] = (255, 255, 255, 0)  # transparent corner
                        continue
                
                # Gradient effect
                factor = 0.85 + 0.15 * (1 - y / height)
                pixels[y][x] = (
                    min(255, int(bg_r * factor)),
                    min(255, int(bg_g * factor)),
                    min(255, int(bg_b * factor)),
                    255
                )
            else:
                pixels[y][x] = (255, 255, 255, 0)
    
    # Convert to RGBA bytes
    raw_rows = []
    for row_pixels in pixels:
        row = bytes([0])  # filter: None
        for px in row_pixels:
            row += bytes(px)
        raw_rows.append(row)
    
    raw_data = b''.join(raw_rows)
    compressed = zlib.compress(raw_data, 9)
    
    def chunk(name, data):
        c = name + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    
    signature = b'\x89PNG\r\n\x1a\n'
    # RGBA (color type 6)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Primary blue color: #1a56db = (26, 86, 219)
    R, G, B = 26, 86, 219
    
    for size in [16, 48, 128]:
        png_data = draw_icon(size, R, G, B)
        path = os.path.join(script_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(png_data)
        print(f'Generated: icon{size}.png ({len(png_data)} bytes)')
    
    print('Done!')
