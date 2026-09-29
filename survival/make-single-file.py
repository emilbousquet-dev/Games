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
