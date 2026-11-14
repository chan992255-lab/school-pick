#!/usr/bin/env python3
"""스쿨픽 PWA 아이콘 생성기.

public/favicon.svg 와 같은 브랜드(인디고/퍼플 그라데이션 + 흰색 학사모)를
PIL 로 다시 그려 PNG 로 저장한다. maskable 아이콘으로도 안전하도록
배경은 사각형 전체를 채우고, 학사모는 중앙 60% 안전 영역에 둔다.
"""

from PIL import Image, ImageDraw
import numpy as np

TOP = (139, 130, 255)     # #8b82ff
BOTTOM = (76, 43, 216)    # #4c2bd8
CAP = (255, 255, 255)


def gradient(size: int) -> Image.Image:
    x = np.linspace(0.0, 1.0, size, dtype=np.float32)[None, :]
    y = np.linspace(0.0, 1.0, size, dtype=np.float32)[:, None]
    t = (x + y) / 2.0
    arr = np.zeros((size, size, 3), dtype=np.float32)
    for i in range(3):
        arr[:, :, i] = TOP[i] + (BOTTOM[i] - TOP[i]) * t
    return Image.fromarray(arr.round().astype(np.uint8), "RGB")


def cap_mask(size: int, ss: int = 4) -> Image.Image:
    """학사모(모티머보드) 실루엣을 4배 슈퍼샘플링으로 그려 알파 마스크로 반환."""
    s = size * ss
    m = Image.new("L", (s, s), 0)
    d = ImageDraw.Draw(m)

    def p(x: float, y: float) -> tuple[float, float]:
        # favicon.svg 의 64x64 좌표계를 그대로 사용
        return (x / 64.0 * s, y / 64.0 * s)

    # 모자 윗면(다이아몬드)
    d.polygon([p(32, 15), p(49, 23.5), p(32, 32), p(15, 23.5)], fill=255)

    # 머리 덮는 부분(아래로 둥근 몸통)
    d.rectangle([p(23, 29.5)[0], p(23, 29.5)[1], p(41, 35.5)[0], p(41, 35.5)[1]], fill=255)
    d.pieslice([p(23, 26)[0], p(23, 26)[1], p(41, 45)[0], p(41, 45)[1]], start=0, end=180, fill=255)

    # 술(태슬) 끈
    d.rectangle([p(43.6, 25.6)[0], p(43.6, 25.6)[1], p(45.4, 33)[0], p(45.4, 33)[1]], fill=255)
    d.ellipse([p(42.6, 32.6)[0], p(42.6, 32.6)[1], p(46.4, 37)[0], p(46.4, 37)[1]], fill=255)

    return m.resize((size, size), Image.LANCZOS)


def build(size: int, path: str) -> None:
    base = gradient(size)
    mask = cap_mask(size)
    white = Image.new("RGB", (size, size), CAP)
    Image.composite(white, base, mask).save(path, "PNG", optimize=True)
    print(f"{path}  {size}x{size}")


if __name__ == "__main__":
    import os

    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
    os.makedirs(out, exist_ok=True)
    build(192, os.path.join(out, "icon-192.png"))
    build(512, os.path.join(out, "icon-512.png"))
    build(180, os.path.join(out, "apple-touch-icon.png"))
