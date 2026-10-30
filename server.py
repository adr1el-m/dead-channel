"""Local arcade + ESP32 USB bridge. Python standard library only."""
from collections import deque
import argparse
import glob
import json
import os
from pathlib import Path
import select
import termios
import threading
import time
import tty
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WEB = Path(__file__).resolve().parent / 'web'
lock = threading.Lock()
state = {'x': 1800, 'y': 1845, 'flap': False, 'click': False}
last_seen = 0.0
current_port = None
led_mask = 0
led_updated = 0.0
led_test = False
buzzer_commands = deque(maxlen=8)
lcd_rows = ["DEAD CHANNEL", "PI LINK READY"]
lcd_updated = 0.0
segment_digit = -1
segment_test = False
lcd_seen = 0.0
lcd_report = {}
keypad_seen = 0.0
keypad_state = {"key":"", "hangup":False}
keypad_events = deque(maxlen=32)
keypad_sequence = 0
keypad_epoch = str(time.time_ns())


def serial_reader(port):
    global state, last_seen, current_port, led_test
    while True:
        fd = None
        previous = None
        try:
            matches = sorted(glob.glob('/dev/cu.usbserial*') + glob.glob('/dev/cu.SLAB_USBtoUART*') + glob.glob('/dev/ttyUSB*') + glob.glob('/dev/ttyACM*'))
            device = port or (matches[0] if len(matches) == 1 else None)
            if not device:
                time.sleep(1)
                continue
            fd = os.open(device, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
            previous = termios.tcgetattr(fd)
            tty.setraw(fd)
            cfg = termios.tcgetattr(fd)
            cfg[4] = cfg[5] = termios.B115200
            termios.tcsetattr(fd, termios.TCSANOW, cfg)
            termios.tcflush(fd, termios.TCIFLUSH)
            print(f'Controller opened: {device}', flush=True)
            buf = b''
            sent_led = 0.0
            received = time.monotonic()
            while True:
                now = time.monotonic()
                if now - sent_led >= .25:
                    with lock:
                        output = led_mask if now-led_updated < 1.5 else 0
                        test = led_test
                        led_test = False
                        buzzer = None
                        while buzzer_commands:
                            sound, requested = buzzer_commands.popleft()
                            if now-requested < 1:
                                buzzer = sound
                                break
                    payload = ("T\n" if test else f"L{output}\n")
                    if buzzer is not None:
                        payload += f"B{buzzer}\n"
                    os.write(fd, payload.encode())
                    sent_led = now
                if not select.select([fd], [], [], .2)[0]:
                    if time.monotonic() - received > 3:
                        raise OSError('Controller stopped reporting')
                    continue
                chunk = os.read(fd, 4096)
                if not chunk:
                    raise OSError('Controller disconnected')
                buf += chunk
                if len(buf) > 16384:
                    buf = b''
                while b'\n' in buf:
                    line, buf = buf.split(b'\n', 1)
                    try:
                        value = json.loads(line)
                        if not isinstance(value, dict):
                            continue
                        if not all(type(value.get(k)) is int and 0 <= value[k] <= 4095 for k in ('x', 'y')):
                            continue
                        if not all(type(value.get(k)) is bool for k in ('flap', 'click')):
                            continue
                        with lock:
                            state = {k: value[k] for k in ('x', 'y', 'flap', 'click')}
                            if type(value.get('leds')) is int and 0 <= value['leds'] <= 7:
                                state['leds'] = value['leds']
                            if type(value.get('knob')) is int and 0 <= value['knob'] <= 4095:
                                state['knob'] = value['knob']
                            if type(value.get('buzzer')) is int and 0 <= value['buzzer'] <= 2000:
                                state['buzzer'] = value['buzzer']
                            last_seen = received = time.monotonic()
                            current_port = device
                    except (ValueError, UnicodeDecodeError):
                        continue
        except (OSError, termios.error) as exc:
            print(f'Controller waiting: {exc}', flush=True)
        finally:
            if fd is not None:
                try:
                    if previous is not None:
                        termios.tcsetattr(fd, termios.TCSANOW, previous)
                except (OSError, termios.error):
                    pass
                os.close(fd)
        time.sleep(1)


def lcd_reader(port):
    global lcd_seen, lcd_report, segment_test
    while True:
        fd = None
        previous = None
        try:
            fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
            previous = termios.tcgetattr(fd)
            tty.setraw(fd)
            cfg = termios.tcgetattr(fd)
            cfg[4] = cfg[5] = termios.B115200
            termios.tcsetattr(fd, termios.TCSANOW, cfg)
            termios.tcflush(fd, termios.TCIFLUSH)
            buf = b''
            sent = 0.0
            received = time.monotonic()
            while True:
                now = time.monotonic()
                if now-sent >= .25:
                    with lock:
                        fresh=now-lcd_updated < 3
                        rows = lcd_rows[:] if fresh else ['DEAD CHANNEL', 'WAITING FOR GAME']
                        digit = segment_digit if fresh else -1
                        test = segment_test
                        segment_test = False
                    message = 'D' + rows[0].ljust(16) + '|' + rows[1].ljust(16) + '\n'
                    message += 'S'+(str(digit) if digit>=0 else '-')+'\n'
                    if test:message += 'T\n'
                    os.write(fd, message.encode('ascii'))
                    sent = now
                if not select.select([fd], [], [], .1)[0]:
                    if now-received > 8:
                        raise OSError('LCD station stopped reporting')
                    continue
                chunk = os.read(fd, 4096)
                if not chunk:
                    raise OSError('LCD disconnected')
                buf += chunk
                if len(buf) > 8192:
                    buf = b''
                while b'\n' in buf:
                    line, buf = buf.split(b'\n', 1)
                    try:
                        value = json.loads(line)
                        if isinstance(value, dict) and value.get('device') == 'dead-channel-lcd' and type(value.get('lcd')) is bool:
                            with lock:
                                lcd_report = {k: value[k] for k in ('lcd', 'row1', 'row2', 'digit', 'segmentTest', 'i2cStatus', 'lcdInitStatus') if k in value}
                                lcd_seen = received = time.monotonic()
                    except (ValueError, UnicodeDecodeError):
                        pass
        except (OSError, termios.error):
            pass
        finally:
            if fd is not None:
                try:
                    if previous is not None:
                        termios.tcsetattr(fd, termios.TCSANOW, previous)
                except (OSError, termios.error):
                    pass
                os.close(fd)
        time.sleep(1)


def keypad_reader(port):
    global keypad_seen, keypad_state, keypad_sequence
    while True:
        fd = None
        previous = None
        old_key, old_button = '', False
        try:
            fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
            previous = termios.tcgetattr(fd)
            tty.setraw(fd)
            cfg = termios.tcgetattr(fd)
            cfg[4] = cfg[5] = termios.B115200
            termios.tcsetattr(fd, termios.TCSANOW, cfg)
            termios.tcflush(fd, termios.TCIFLUSH)
            received = time.monotonic()
            buf = b''
            first = True
            while True:
                if not select.select([fd], [], [], .2)[0]:
                    if time.monotonic()-received > 3:
                        raise OSError('Keypad stopped reporting')
                    continue
                chunk = os.read(fd, 4096)
                if not chunk:
                    raise OSError('Keypad disconnected')
                buf += chunk
                if len(buf)>8192:
                    buf=b''
                while b'\n' in buf:
                    line,buf=buf.split(b'\n',1)
                    try:
                        value=json.loads(line)
                        if not isinstance(value,dict) or value.get('device')!='dead-channel-keypad':
                            continue
                        key=value.get('key')
                        button=value.get('hangup')
                        if not isinstance(key,str) or (key!='' and (len(key)!=1 or key not in '0123456789ABCD*#')) or type(button) is not bool:
                            continue
                        with lock:
                            received=keypad_seen=time.monotonic()
                            keypad_state={'key':key,'hangup':button}
                            if not first:
                                events=[]
                                if key and key!=old_key:
                                    events.append(key)
                                if button and not old_button:
                                    events.append('hangup')
                                for event in events:
                                    keypad_sequence+=1
                                    keypad_events.append({'id':keypad_sequence,'key':event,'time':received})
                        old_key,old_button=key,button
                        first=False
                    except (ValueError,UnicodeDecodeError):
                        pass
        except (OSError,termios.error):
            pass
        finally:
            if fd is not None:
                try:
                    if previous is not None:
                        termios.tcsetattr(fd,termios.TCSANOW,previous)
                except (OSError,termios.error):
                    pass
                os.close(fd)
        time.sleep(1)


def snapshot():
    with lock:
        connected = time.monotonic() - last_seen < .8
        return {**state, 'keypad':{**keypad_state,'epoch':keypad_epoch,'connected':time.monotonic()-keypad_seen < 1,'events':[{'id':e['id'],'key':e['key']} for e in keypad_events if time.monotonic()-e['time'] < 1]}, 'connected': connected, 'port': current_port,
                'flap': state['flap'] if connected else False,
                'click': state['click'] if connected else False}


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def do_POST(self):
        global led_mask, led_updated, led_test, lcd_rows, lcd_updated, segment_digit, segment_test
        if self.path not in ('/api/leds', '/api/lcd', '/api/buzzer', '/api/segment'):
            self.send_error(404)
            return
        origin = self.headers.get('Origin')
        if origin and origin not in (f"http://{self.headers.get('Host')}", f"https://{self.headers.get('Host')}"):
            self.send_error(403)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 128:
                raise ValueError()
            value = json.loads(self.rfile.read(length))
            if not isinstance(value, dict):
                raise ValueError()
            if self.path == '/api/segment':
                if value.get('test') is not True:
                    raise ValueError()
                with lock:segment_test=True
                self.send_response(204)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            if self.path == '/api/buzzer':
                sounds = {'stop':0, 'ring':1, 'warning':2, 'success':3, 'loss':4}
                sound = value.get('sound')
                if not isinstance(sound, str) or sound not in sounds:
                    raise ValueError()
                with lock:
                    if sound == 'stop':
                        buzzer_commands.clear()
                    buzzer_commands.append((sounds[sound], time.monotonic()))
                self.send_response(204)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            if self.path == '/api/lcd':
                digit=value.get('digit',-1)
                if type(digit) is not int or not -1<=digit<=9:raise ValueError()
                rows = value.get('rows')
                if not isinstance(rows, list) or len(rows) != 2 or any(not isinstance(row, str) or len(row)>16 for row in rows):
                    raise ValueError()
                rows = [''.join(ch if 32 <= ord(ch) <= 126 and ch not in '\\"|' else ' ' for ch in row) for row in rows]
                with lock:
                    segment_digit = digit
                    lcd_rows = rows
                    lcd_updated = time.monotonic()
                self.send_response(204)
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            mask = value.get('mask', 0)
            if type(mask) is not int or not 0 <= mask <= 7:
                raise ValueError()
            with lock:
                led_mask = mask
                led_updated = time.monotonic()
                if value.get('test') is True:
                    led_test = True
        except (ValueError, TypeError):
            self.send_error(400)
            return
        self.send_response(204)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/lcd':
            with lock:
                value = {**lcd_report, 'connected': time.monotonic()-lcd_seen < 3}
            body = json.dumps(value).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == '/api/controller':
            body = json.dumps(snapshot()).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == '/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('Connection', 'keep-alive')
            self.end_headers()
            try:
                self.connection.settimeout(3)
                while True:
                    self.wfile.write(('data: ' + json.dumps(snapshot()) + '\n\n').encode())
                    self.wfile.flush()
                    time.sleep(.02)
            except (OSError, ConnectionError):
                pass
        else:
            super().do_GET()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--serial', default=None)
    parser.add_argument('--lcd-serial', default='/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0')
    parser.add_argument('--keypad-serial', default='/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_A5069RR4-if00-port0')
    args = parser.parse_args()
    threading.Thread(target=serial_reader, args=(args.serial,), daemon=True).start()
    threading.Thread(target=lcd_reader, args=(args.lcd_serial,), daemon=True).start()
    threading.Thread(target=keypad_reader, args=(args.keypad_serial,), daemon=True).start()
    server = ThreadingHTTPServer(('0.0.0.0', args.port), Handler)
    server.daemon_threads = True
    print(f'Arcade: http://localhost:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
