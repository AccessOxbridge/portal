"""Turn raw capture PNGs into the cropped, compressed JPEGs the guides use.

Usage (from this folder):  python3 process-shots.py
Needs Pillow (pip install pillow). Crop boxes are in a 1000-wide coordinate
space so they work at any capture scale.
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# folder -> {name: (crop box or None, output width, keep top fraction or None)}
JOBS = {
    'shots': {
        'booking': ((285, 50, 715, 575), 1400, None),
        'hours': ((330, 150, 670, 475), 1400, None),
        'help': ((330, 148, 670, 478), 1400, None),
        'feedback': ((415, 50, 765, 440), 1400, None),
        'mentors-crop': (None, 2000, 0.6),  # from mentors.png
        'mobile-home': (None, 780, None),
    },
    'shots-mentor': {
        'invoicing': ((200, 40, 976, 358), 2000, None),
        'payouts': ((0, 0, 1000, 520), 2000, None),
        'request-session': ((275, 22, 725, 585), 1300, None),
        'report-form': ((290, 125, 710, 495), 1300, None),
        'checkin': ((330, 105, 670, 515), 1400, None),
        'mobile': (None, 780, None),
    },
}
SOURCE = {'mentors-crop': 'mentors'}


def process(folder):
    path = os.path.join(HERE, folder)
    if not os.path.isdir(path):
        return
    special = JOBS[folder]
    names = {f[:-4] for f in os.listdir(path) if f.endswith('.png') and not f.startswith('_')}
    names |= {n for n, src in SOURCE.items() if src in names and n in special}
    for name in sorted(names):
        src = os.path.join(path, SOURCE.get(name, name) + '.png')
        if not os.path.exists(src):
            continue
        box, width, top = special.get(name, (None, 2000, None))
        im = Image.open(src).convert('RGB')
        if box:
            k = im.width / 1000
            im = im.crop(tuple(int(v * k) for v in box))
        if top:
            im = im.crop((0, 0, im.width, int(im.height * top)))
        if im.width > width:
            im = im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)
        out = os.path.join(path, name + '.jpg')
        im.save(out, quality=82, optimize=True, progressive=True)
        print(folder + '/' + name + '.jpg', im.size)


if __name__ == '__main__':
    for folder in JOBS:
        process(folder)
