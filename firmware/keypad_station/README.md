# Nano extension keypad and hangup button

Classic Nano-compatible ATmega328P with FT232 USB serial.
Detected on the Pi independently of the Uno and ESP32.
Bootloader works at 115200 baud (the 57600 old-bootloader attempt did not sync).
Compile: arduino:avr:nano:cpu=atmega328.
Upload with avrdude through the Pi, stopping dead-channel first to release serial.

Wiring: keypad connector contacts 1–8 (front view, tail down, left to right)
to D2–D9; D10 button to GND, INPUT_PULLUP.
Observed physical 1,2,3,4 initially decoded as D,C,B,#. Firmware corrects the
reversed connector order with rows D9,D8,D7,D6 and columns D5,D4,D3,D2.
Do not rewire to match these internal row assignments.
Key/button inputs debounce 25 ms. Ambiguous multi-key combinations are ignored.
Serial sends key-down/up states and hangup boolean, plus heartbeat at 115200 baud.

The bridge reports Nano connection and inputs separately within /api/controller.
Events are numbered, deduplicated in-browser, expire after 1 second, and held
keys do not auto-repeat. A server epoch resets the browser's event cursor.

Please Hold enables extension mode at start when the Nano is connected and
'Require Nano extension keypad' is enabled. LCD/canvas show the four-digit
extension. Type it, # to submit, * to clear. In full console mode, a correct code authorizes the line; interpret the caller clue and choose the destination with the joystick.
Then hold the original ESP32 button, releasing before the eye opens.
Wrong codes add attention. Nano button (or D key) cancels partial progress,
clears authorization, rotates the extension and waits 3 seconds. The same
caller still needs to be connected. Nano disconnect pauses a keypad run.
