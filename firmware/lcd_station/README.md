# Uno 16x2 I2C LCD station

Uno-compatible ATmega328P board (CH340 USB adapter) connected to Pi USB.
Stable device: `/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0`.
LCD wiring: GND→GND, VCC→5V, SDA→A4, SCL→A5 (Uno only).
Detected backpack at 0x27 on 2026-10-30.

Driver: hd44780 1.3.2 by Bill Perry, hd44780_I2Cexp auto-configuration.
Compile with arduino:avr:uno. Upload through Pi avrdude only while the
LCD serial reader is stopped (stop the dead-channel user service first).
No bootloader replacement or fuse changes are needed.

Protocol at 115200 baud: `D` + 16 ASCII characters + `|` + 16 ASCII
characters + newline. Firmware replies with device identity, LCD init status,
and the two rows. The reply confirms firmware state, not optical text visibility.
A stale serial link shows WAITING FOR GAME after five seconds.

The server opens both controllers independently. POST /api/lcd takes
{"rows":["first row","second row"]}; GET /api/lcd returns readiness and rows.
The browser publishes current game text every 400 ms while visible.
Please Hold shows tuning, extension and routing information; it deliberately omits eye-release warnings. Dead Frequency shows tuning;
other games show titles and scores. Pause/loss/victory have their own messages.
If the LCD is backlit but text is unreadable, adjust the backpack contrast trimmer.

## 5161AS common-cathode seven-segment expansion

Uno D2..D8 drive a,b,c,d,e,f,g respectively, each through an individual 330 Ω
resistor. Display pins a=7,b=6,c=4,d=2,e=1,f=9,g=10. Commons 3 and 8 to
Uno GND; decimal pin 5 unused. Pin numbering is FRONT view, decimal bottom-right.
LCD remains on A4/A5. Serial S0..S9 sets a digit; S- blanks; T tests 0..9
for one second each and restores the requested digit. Test is nonblocking.
Telemetry includes digit (-1 means blank) and segmentTest.

Browser sends digit with POST /api/lcd. POST /api/segment {"test":true}
starts the diagnostic. Please Hold displays 6 minus connected callers;
Dead Frequency shows fuses, other games lives or bounded progress.
Menu and stale game sessions blank the digit.

2026-10-30: compiled/flashed/verified Uno firmware and deployed bridge; all
26 Node tests passed. Uno reported every test digit 0..9 in sequence.
User reports physical display remains dark. Wiring/placement not yet verified;
do not treat firmware output acknowledgements as confirmed illumination.

### LCD recovery fix

A disconnected LCD could make repeated no-address begin() calls advance
hd44780_I2Cexp's static AutoInst device index. Later probes ACKed 0x27 while
begin still returned RV_ENXIO (-4). The station now constructs the driver
with explicit address 0x27, keeping pin-map discovery but avoiding instance
skipping during retries. Compiled/uploaded/flash-verified; runtime reports
I2C status 0 and initialization 0, and acknowledged LCD CONNECTED /
READY FOR CALLS with digit 6 through the localhost-to-Pi gateway.
