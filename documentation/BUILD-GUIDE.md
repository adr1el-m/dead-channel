# Portable build guide

Dead Channel / Please Hold — 30 October 2026.

The game runs in the browser. A Linux Raspberry Pi hosts Python's USB bridge and static files. ESP32 is the analog/control station, Uno the display station, and Nano the keypad station. Read the illustrated PDF and wiring-netlist.csv before assembly. The diagram is a logical connection reference, not a simulated circuit.

## Toolchain

Python 3 (standard library only) on a Linux host with serial-device permission; Node.js for tests; Arduino CLI or IDE; ESP32 board core for the ESP32 and Arduino AVR core for Uno/Nano. Install Bill Perry's hd44780 library (1.3.2 used here). The classic Nano specimen used the current ATmega328P bootloader at 115200; clones can differ.

Compile sketches using board targets matching your actual hardware, for example:

```sh
arduino-cli compile --fqbn esp32:esp32:esp32doit-devkit-v1 firmware/haunted_controller
arduino-cli compile --fqbn arduino:avr:uno firmware/lcd_station
arduino-cli compile --fqbn arduino:avr:nano:cpu=atmega328 firmware/keypad_station
```

Stop any process holding each serial port before upload. Upload the matching sketch to the matching board using its actual local port. Do not change bootloader fuses to resolve ordinary port or board-selection mistakes. Firmware source is included; the source snapshot deliberately omits compiled binaries and machine-specific deployment scripts.

## Host launch

Identify your own ports, preferably /dev/serial/by-id entries. The runtime includes default paths from this prototype; override them rather than relying on another unit's serial identifier.

```sh
python3 server.py --serial /dev/serial/by-id/YOUR_ESP32 --lcd-serial /dev/serial/by-id/YOUR_UNO --keypad-serial /dev/serial/by-id/YOUR_NANO
```

On the same trusted local network open http://PI_LAN_ADDRESS:8765/ in Safari or another modern browser. The host needs permission to open each device. This bridge uses POSIX serial APIs and is not a Windows serial implementation. A USB-C Pi power supply is required; the exact supply/current budget has not been measured in this prototype. Do not expose port 8765 to the internet.

## Commissioning

With power removed, verify the netlist and rail continuity. ESP32 controls use 3.3 V, Uno LCD 5 V. Every LED/segment has its own resistor. Identify an unknown buzzer before copying its drive arrangement. After powering up, test the controls separately: centered joystick/direction learning, knob span, connect and click, green/yellow/red individually, readable LCD, digits 0–9, all 16 keypad keys and hang-up. The corrected keypad mapping is specimen-specific.

The diagnostics endpoints include /api/controller and /api/lcd. A serial acknowledgement is not optical proof of a correct display. Check actual letters, digits and LED colors. On the iPad run direction learning again because browser storage is origin-specific. Start Please Hold in full console mode when all required stations are available; use rehearsal for software development.

## Verification

```sh
npm test
```

The documented automated suite passed 30 tests on 30 October 2026. Browser rehearsal, hardware-output integration and a complete physical playthrough are separate evidence categories. See EVIDENCE.md for the claim boundaries. Supply current, latency and a complete recorded hardware win are not certified by this package.

## Source map

- web/switchboard.js: Please Hold rules, callers and drawing.
- web/arcade.js: browser input, modes, health, output dispatch.
- web/lcd.js: physical display text/digit policy.
- web/halloween.js, web/art/: seasonal graphics and provenance.
- web/audio.js: procedural browser sound.
- server.py: serial bridges, HTTP and live events.
- firmware/haunted_controller/: ESP32 sketch.
- firmware/lcd_station/: Uno sketch.
- firmware/keypad_station/: Nano sketch.
- tests/: dependency-free Node verification.

Public source: https://github.com/adr1el-m/channel. Browser demo: https://adr1el-m.github.io/channel/. Gameplay video link is still pending. No third-party redistribution license for the entire project is asserted by this snapshot; retain library/toolchain notices and review asset rights before redistribution under a selected license.
