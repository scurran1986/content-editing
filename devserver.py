# Dev server: serves the app on http://localhost:8787 and appends POST /log bodies to dev.log
# so logs from the phone/Chrome are readable from WSL. Run: python3 devserver.py
import http.server, sys
LOG = 'dev.log'
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        line = self.rfile.read(n).decode(errors='replace')
        with open(LOG, 'a') as f: f.write(line + '\n')
        self.send_response(204); self.end_headers()
    def log_message(self, *a): pass
open(LOG, 'w').close()
http.server.ThreadingHTTPServer(('0.0.0.0', 8787), H).serve_forever()
