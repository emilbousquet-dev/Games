# ============================================================
#  DEAD ACRES — pack the whole game into ONE file
#
#  Makes "dead-acres.html": the page with every script inside it.
#  That one file works anywhere (even in apps that can't see the
#  js folder) and is easy to send to friends.
#
#  Run it again after changing the game:   python3 make-single-file.py
# ============================================================
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, 'index.html'), encoding='utf-8').read()


def inline(match):
    src = match.group(1)
    code = open(os.path.join(HERE, src), encoding='utf-8').read()
    code = code.replace('</script', '<\\/script')  # so the browser doesn't end the script too early
    return '<script>/* ' + src + ' */\n' + code + '\n</script>'


out = re.sub(r'<script src="([^"]+)"></script>', inline, page)
path = os.path.join(HERE, 'dead-acres.html')
open(path, 'w', encoding='utf-8').write(out)
print('Made', path, '(%d KB)' % (len(out.encode('utf-8')) // 1024))

# a copy for a claude.ai web page (it adds its own <html>, <head> and <body>):
#   python3 make-single-file.py web-page.html
import sys
if len(sys.argv) > 1:
    page_only = out
    for tag in ['<!doctype html>', '<html lang="en">', '<head>', '</head>', '<body>', '</body>', '</html>']:
        page_only = page_only.replace(tag, '', 1)
    page_only = page_only.replace('<meta charset="utf-8">', '').replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '')
    page_only = page_only.replace('<style>', '<style>\n  :root { color-scheme: dark; }', 1)
    open(sys.argv[1], 'w', encoding='utf-8').write(page_only.strip() + '\n')
    print('Made', sys.argv[1])
