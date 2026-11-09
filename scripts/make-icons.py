# Draws the four-square Daily Run icon as PNGs with only the standard library.
import struct, zlib, sys, os

COLOURS = [(0x6a, 0xaa, 0x64), (0xc9, 0xb4, 0x58), (0xb0, 0xc4, 0xef), (0xba, 0x81, 0xc5)]

def png(size):
    pad = max(1, round(size * 0.06)); gap = max(1, round(size * 0.08)); r = max(1, round(size * 0.07))
    cell = (size - 2 * pad - gap) / 2
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            px = (0, 0, 0, 0)
            for i, c in enumerate(COLOURS):
                x0 = pad + (i % 2) * (cell + gap); y0 = pad + (i // 2) * (cell + gap)
                if x0 <= x < x0 + cell and y0 <= y < y0 + cell:
                    # rounded corners
                    dx = max(x0 + r - x - 0.5, 0, x + 0.5 - (x0 + cell - r))
                    dy = max(y0 + r - y - 0.5, 0, y + 0.5 - (y0 + cell - r))
                    if dx * dx + dy * dy <= r * r:
                        px = (*c, 255)
            row += bytes(px)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')

out = sys.argv[1]
for s in (16, 32, 48, 128):
    open(os.path.join(out, f'{s}.png'), 'wb').write(png(s))
print('icons written to', out)
