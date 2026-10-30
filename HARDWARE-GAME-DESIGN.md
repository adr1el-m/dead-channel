# Please Hold: one operator, three controllers

## The playable loop

1. **Tune**: the ESP32 reads the potentiometer. Find the carrier and hold it
   clear for 450 ms to recover the caller's message and extension.
2. **Dial**: the Uno LCD reveals the four-digit extension. Enter it with the
   Nano keypad and submit with #. * clears. Authorization does not select a room.
3. **Route**: interpret a hand-authored destination clue. Move the ESP32
   joystick to the named destination. There is no automatically highlighted answer.
4. **Connect**: maintain the carrier and hold the original ESP32 button for
   1.35 safe seconds. Let go during the eye's red phase. Partial progress remains
   when released or detuned. Wrong routes or codes raise operator attention.
5. **Recover**: the Nano's separate button grounds the line. It removes 35%
   attention but sacrifices the current code, authorization, and connection;
   a three-second cooldown prevents repeated cancellation from erasing risk.
6. Repeat for six callers. Each destination is used once; each completed
   call adds a unique epilogue to the paper log. Completing all six ends the shift.

## Output responsibilities

- **Green LED**: current may safely flow. **Yellow**: one-second warning.
  **Red**: the operator is listening; release the connection button.
- **Buzzer**: call arrival, warning, code/signal/connection feedback and loss.
  Hardware audio has its own mute and does not require browser audio permission.
- **LCD**: operative extension, typed code, chosen route, lost-carrier and
  immediate safety messages. The live-console screen does not disclose the code.
- **Seven-segment**: number of callers still waiting, 6 down to 0.
- **Canvas**: caller's words, six destinations, carrier quality and operator eye.
  The selected socket is the operator's choice, not an answer indicator.
- **Pi**: serves the game and independently bridges the ESP32, Uno and Nano.
  USB by-id paths avoid ambiguity when devices reconnect in a different order.

## Fairness and accessibility

A silent line lowers attention. There is no hidden global deadline and no
random instant death. Eye timing is deterministic, with a visible warning.
A failed route does not delete a completed caller. Hardware disconnection pauses
an active hardware shift. LCD initialization loss is reported rather than hiding
required information. The Uno retries LCD initialization when I2C reconnects.

Rehearsal uses exactly the same game rules with a visible LCD substitute,
on-screen tuning/keypad, keyboard steering and Space to hold. Live-console mode
uses the physical devices and hides those substitute controls. The other six
arcade cartridges are archived behind a disclosure panel.

## Validation

30 Node tests cover the existing cartridges and the integrated console loop,
including tuning/code/route gating, safe holds, hangup cost/cooldown, display
messages, and a complete six-caller console win. Isolated browser tests exercise
actual slider/keypad/steering/hold controls through the ending, pause/resume and
320/390/768px layouts, with hardware requests stubbed to avoid disturbing play.
These automated runs are distinct from a manual physical six-call playthrough.
