"""Local browser gateway to the Raspberry Pi's single game/USB bridge.
The Pi serves all assets and API data; the Mac does not open any USB device.
"""
import argparse
import http.client
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

HOP_HEADERS = {'connection','keep-alive','proxy-authenticate','proxy-authorization',
               'te','trailer','transfer-encoding','upgrade'}

class Gateway(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.0'

    def forward(self):
        upstream = self.server.upstream
        connection = http.client.HTTPConnection(upstream.hostname, upstream.port or 80, timeout=8)
        started=False
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 <= length <= 16384:
                self.send_error(413)
                return
            body = self.rfile.read(length) if length else None
            headers = {k:v for k,v in self.headers.items()
                       if k.lower() not in HOP_HEADERS | {'host', 'accept-encoding'}}
            headers['Host'] = upstream.netloc
            # Preserve same-origin checks while forwarding this trusted local origin.
            if headers.get('Origin') in (f"http://{self.headers.get('Host')}", f"https://{self.headers.get('Host')}"):
                headers['Origin'] = f'{upstream.scheme}://{upstream.netloc}'
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            self.send_response(response.status)
            for key,value in response.getheaders():
                if key.lower() not in HOP_HEADERS | {'server','date'}:
                    self.send_header(key,value)
            self.send_header('Connection','close')
            self.end_headers()
            started=True
            if self.command != 'HEAD':
                while True:
                    chunk = response.read1(8192)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
        except (OSError, ValueError, http.client.HTTPException):
            # A stream that already sent headers is simply closed on upstream loss.
            if started:
                return
            try:
                self.send_error(502, 'Raspberry Pi unavailable: check Pi power and Wi-Fi')
            except OSError:
                pass
        finally:
            connection.close()
            self.close_connection = True

    do_GET = forward
    do_HEAD = forward
    do_POST = forward

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--upstream',default='http://wni-pi5.local:8765')
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    upstream=urlsplit(args.upstream)
    if upstream.scheme != 'http' or not upstream.hostname or upstream.path not in ('','/'):
        parser.error('upstream must be an HTTP origin')
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Gateway)
    server.daemon_threads=True
    server.upstream=upstream
    print(f'Local arcade gateway: http://localhost:{args.port} -> {args.upstream}',flush=True)
    server.serve_forever()
