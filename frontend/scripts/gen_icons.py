"""Generate LocalPulse PWA icons (pure stdlib — no Pillow needed).

Draws the logo mark (house + pulse) on the canonical primary green #416448.
Sizes: 192, 512 (any), 512 maskable (full-bleed), 180 (apple touch).
"""
import math
import os
import struct
import zlib

GREEN = (65, 100, 72)  # #416448 primary
WHITE = (255, 255, 255)


def write_png(path, w, h, rgba):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw.extend(rgba[y * stride : (y + 1) * stride])
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    t = max(0.0, min(1.0, (wx * vx + wy * vy) / (vx * vx + vy * vy)))
    dx, dy = wx - t * vx, wy - t * vy
    return math.hypot(dx, dy)


def triangle_dist(px, py, a, b, c):
    d = min(
        seg_dist(px, py, *a, *b),
        seg_dist(px, py, *b, *c),
        seg_dist(px, py, *c, *a),
    )
    # inside test (sign of cross products)
    def cross(o, p, q):
        return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0])

    if (
        cross(a, b, (px, py)) >= 0
        and cross(b, c, (px, py)) >= 0
        and cross(c, a, (px, py)) >= 0
    ) or (
        cross(a, b, (px, py)) <= 0
        and cross(b, c, (px, py)) <= 0
        and cross(c, a, (px, py)) <= 0
    ):
        return -d
    return d


def rounded_rect_sdf(px, py, cx, cy, hw, hh, r):
    qx = abs(px - cx) - (hw - r)
    qy = abs(py - cy) - (hh - r)
    ox, oy = max(qx, 0.0), max(qy, 0.0)
    return math.hypot(ox, oy) + min(max(qx, qy), 0.0) - r


def render(size, out_path, rounded=True):
    s = size / 32.0
    r_outer = 9.0 * s if rounded else 0.0
    pixels = bytearray(size * size * 4)
    SS = 3  # supersampling factor

    # Pulse polyline (normalized 32-space, matches LogoMark viewBox)
    pulse_segs = [
        (8.5, 16.5, 12.5, 16.5),
        (12.5, 16.5, 14.5, 11.5),
        (14.5, 11.5, 18.0, 20.5),
        (18.0, 20.5, 20.0, 16.5),
        (20.0, 16.5, 23.5, 16.5),
    ]

    for y in range(size):
        for x in range(size):
            r_acc = g_acc = b_acc = a_acc = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    fx = (x + (sx + 0.5) / SS) / s
                    fy = (y + (sy + 0.5) / SS) / s
                    # outer rounded-square alpha
                    outer = rounded_rect_sdf(fx, fy, 16, 16, 16, 16, r_outer / s)
                    if outer > 0:
                        continue  # transparent corner
                    bg_a = 1.0
                    r_, g_, b_ = GREEN
                    # house: roof triangle + body rounded rect
                    roof = triangle_dist(fx, fy, (6, 14.5), (16, 6), (26, 14.5))
                    body = rounded_rect_sdf(fx, fy, 16, 21, 10, 13, 1.5)
                    house = min(roof, body)
                    house_alpha = max(0.0, min(1.0, 0.5 - house)) * 0.88
                    if house_alpha > 0:
                        r_ = r_ + (WHITE[0] - r_) * house_alpha
                        g_ = g_ + (WHITE[1] - g_) * house_alpha
                        b_ = b_ + (WHITE[2] - b_) * house_alpha
                    # house stroke
                    stroke = max(0.0, min(1.0, 1.6 - abs(house))) * 0.9
                    if stroke > 0:
                        r_ = r_ + (WHITE[0] - r_) * stroke
                        g_ = g_ + (WHITE[1] - g_) * stroke
                        b_ = b_ + (WHITE[2] - b_) * stroke
                    # pulse line
                    pulse = min(seg_dist(fx, fy, *seg) for seg in pulse_segs)
                    pulse_a = max(0.0, min(1.0, 1.1 - pulse))
                    if pulse_a > 0:
                        r_ = r_ + (WHITE[0] - r_) * pulse_a
                        g_ = g_ + (WHITE[1] - g_) * pulse_a
                        b_ = b_ + (WHITE[2] - b_) * pulse_a
                    r_acc += r_
                    g_acc += g_
                    b_acc += b_
                    a_acc += bg_a
            n = SS * SS
            idx = (y * size + x) * 4
            pixels[idx] = round(r_acc / n)
            pixels[idx + 1] = round(g_acc / n)
            pixels[idx + 2] = round(b_acc / n)
            pixels[idx + 3] = round(255 * a_acc / n)
    write_png(out_path, size, size, pixels)


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
    os.makedirs(out_dir, exist_ok=True)
    render(512, os.path.join(out_dir, "icon-512.png"), rounded=True)
    render(192, os.path.join(out_dir, "icon-192.png"), rounded=True)
    render(512, os.path.join(out_dir, "icon-maskable-512.png"), rounded=False)
    render(180, os.path.join(out_dir, "app-icon.png"), rounded=False)
    print("icons written to", os.path.normpath(out_dir))


if __name__ == "__main__":
    main()
