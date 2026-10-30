# Evidence ledger — 30 October 2026

| Claim | Basis | Boundary |
|---|---|---|
| Installed component set | Five supplied prototype photographs | Hidden breadboard connections are not fully traceable. |
| Pin map and configured rules | Current .ino, server.py and web JS source | Wiring atlas expresses intended current logical wiring, not electrical continuity measurements. |
| 30 engine/display tests pass | npm test rerun for this documentation edition; output in validation/node-tests.txt | Automated software verification, not all hardware behavior. |
| Six-call ending reachable | Prior browser rehearsal using simulated controls | Not proof of a six-call physical win. |
| Browser→Pi→display output | Prior integration run, simulated input and real Pi outputs; LCD extension acknowledged and segment6→5 | Firmware state acknowledgement is not optical verification of all text. |
| LEDs, knob and seven-segment physically respond | User confirmations during commissioning | No measured electrical current, brightness, latency or long-run reliability. |
| Nano reverse mapping identified | Initial physical 1,2,3,4 sequence received as D,C,B,# and hang-up observed | Corrected firmware uploaded; complete post-correction 16-key physical verification not retained. |
| LCD recovered after explicit-address change | I2C/init reports0 and acknowledged rows | Live text readability should still be checked; photographs show an earlier Ghost Flight menu. |
| Gameplay recording exists | User reports successful recording | File/link not supplied or reviewed; content and ending not established. |
| Pi USB host fault recovered | Kernel host-controller failure and reboot restoring three serial devices | Underlying cause unresolved; no proof that power caused or excluded the fault. |
| 2.5D assembly drawing | Reconstructed from supplied photos, normalized placement | Not Tinkercad CAD, photogrammetry, electrical simulation or row-by-row reconstruction. |

## Honest open items

Add/review gameplay video; verify every keypad symbol; identify buzzer; measure current and latency; secure LCD wiring; perform a sustained physical playthrough. These do not prevent documenting the implemented prototype but limit stronger reliability/performance claims.

## Public browser edition

The static demo completed a six-caller win using automated browser keyboard controls and the visible tuning/extension UI. Saved ending and pause/resume passed, no hardware API requests or failed assets were observed, and 320/390/768/1440-pixel layouts had no horizontal overflow. See validation/public-demo.json. This does not add a physical hardware win claim.
