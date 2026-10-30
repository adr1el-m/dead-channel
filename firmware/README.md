# Haunted Breadboard controller

ESP32 DevKit V1, using the printed D-pin labels on the photographed board.

| Part | ESP32 pin |
| --- | --- |
| Joystick supply (+5V/VCC label) | 3V3 |
| Joystick ground | GND |
| Joystick VRx | D32 |
| Joystick VRy | D33 |
| Joystick SW | D27 |
| Flap button | D25 and GND, diagonally opposite button legs |

Connect wiring with USB disconnected. Supply the joystick at 3.3 V. The two
buttons use internal pull-ups, so pressed is electrically LOW. The firmware
debounces both buttons and reports logical `true` when pressed.

The controller sends newline-delimited JSON at 115200 baud, approximately
50 reports per second:

```json
{"seq":0,"x":2100,"y":2100,"flap":false,"click":false}
```

Joystick readings are raw 12-bit values (0–4095); actual centers and travel
limits must be measured on the assembled controller before gameplay calibration.

From the project root:

```sh
.tools/arduino-cli compile --config-file arduino-cli.yaml --fqbn esp32:esp32:esp32doit-devkit-v1 firmware/haunted_controller
.tools/arduino-cli board list --config-file arduino-cli.yaml
```

For upload, substitute the actual detected USB serial device for PORT:

```sh
.tools/arduino-cli upload --config-file arduino-cli.yaml --fqbn esp32:esp32:esp32doit-devkit-v1 --port PORT firmware/haunted_controller
.tools/arduino-cli monitor --config-file arduino-cli.yaml --port PORT --config baudrate=115200
```

Hardware check: with controls released, `flap` and `click` should both be
`false`. Pressing the breadboard button should change only `flap`; pressing
the joystick should change only `click`. Moving the stick horizontally or
vertically should change its corresponding axis. Neither button should stay
pressed after release. Compilation alone does not establish correct wiring.

## Three game-state LEDs

Green LED anode → 330 Ω resistor → D18; yellow → resistor → D19;
red → resistor → D23. Each LED cathode connects to GND.
On boot, each colour lights for 600 ms in green/yellow/red order.
The browser settings include a repeatable LED test.

The bridge now writes `L0` through `L7` followed by newline: bit 0 green,
bit 1 yellow, bit 2 red. `T` followed by newline starts the sequential test.
Reports include `leds`, the output mask (not optical confirmation).
Commands expire after 1.5 seconds without updates, switching outputs off.
In Please Hold, green means safe, yellow means eye opening, red means watching.
Pause is yellow, death red, victory green, menu off.

## Physical radio tuning knob

Standard three-terminal potentiometer: outer legs to 3V3 and GND,
wiper/middle leg to D34 (GPIO34). Never feed 5 V into this input.
Firmware averages eight ADC samples and applies smoothing, then reports
`knob` (0–4095). The bridge forwards this value to the browser.
Dead Frequency uses the knob's absolute position when connected and enabled.
Settings offer physical-knob enable/disable, reversal, and a live reading.
Joystick tuning remains available when physical knob control is disabled.

## Current-limited buzzer test (D26)

User-reported resistor bands brown/black/black/brown/brown: 1 kΩ, 1%.
D26 → 1 kΩ series resistor → buzzer positive; buzzer negative → GND.
The buzzer's internal type and rated voltage/current remain unidentified.
This is a current-limited test; firmware acknowledgement does not confirm sound.
Keep the resistor in place. A silent test requires identifying the part/driver,
not bypassing the resistor.

Serial B0 stops; B1 ring (1200 Hz,180 ms); B2 warning (600 Hz,200 ms);
B3 success (1800 Hz,100 ms); B4 loss (300 Hz,250 ms).
Buzzer is off at boot and each event stops automatically. Telemetry `buzzer`
reports the requested tone frequency, zero when idle. HTTP POST /api/buzzer
accepts sound: stop/ring/warning/success/loss. Events expire in the queue.
Browser settings provide a short test and independent hardware-sound toggle.
