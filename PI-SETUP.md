# Run the physical console on Raspberry Pi

The hosted GitHub Pages demo uses browser controls. The physical console instead needs this local Python/USB bridge; never forward it to the public internet.

1. Power the Pi with a suitable USB-C supply and join your local network.
2. Flash the ESP32, Uno and Nano with their corresponding sketches in firmware/.
3. Connect each board to a Pi USB data port. Check the wiring atlas before powering the peripheral circuits.
4. Identify the three devices using `ls -l /dev/serial/by-id/`. The Pi user must have serial-port permission, usually membership in `dialout`.
5. Copy `server.py` and `web/` to the Pi, then run the command below with actual device paths.
6. Open `http://PI_LAN_ADDRESS:8765/` in iPad Safari on the same network. The Mac is not required.

```sh
python3 server.py --serial /dev/serial/by-id/YOUR_ESP32 --lcd-serial /dev/serial/by-id/YOUR_UNO --keypad-serial /dev/serial/by-id/YOUR_NANO
```

Run joystick direction learning on the iPad. Calibration and progress are saved per browser origin and do not transfer from a Mac's localhost automatically. Test every LED individually, readable LCD text, all digits and every keypad symbol before physical gameplay. USB acknowledgements alone do not prove visible output.

## Optional automatic installation

`scripts/deploy-pi.sh USER@PI_HOST` copies the runtime and installs a `dead-channel` user service. Set `ESP32_SERIAL`, `UNO_SERIAL` and `NANO_SERIAL` to your actual by-id paths first. The script uses your normal SSH configuration; configure authentication outside the repository. It does not upload firmware or change bootloaders.

Inspect the created unit with `systemctl --user cat dead-channel`. To start a user service before login, enable lingering for that user and test a reboot. Check the account and permissions before changing host configuration.

```sh
systemctl --user status dead-channel
journalctl --user -u dead-channel -n 50 --no-pager
systemctl --user stop dead-channel
```

## Optional Mac gateway

```sh
python3 pi_gateway.py --upstream http://PI_LAN_ADDRESS:8765
```

This forwards localhost to the Pi and opens no Mac USB device. It is for local development, not a public hosting server.

## Troubleshooting

- Only one board visible: inspect USB cables and Pi kernel logs; do not assume one surviving peripheral proves the whole USB host is healthy.
- LCD backlight/blocks: verify GND, 5 V, SDA=A4, SCL=A5, address and contrast. This specimen uses 0x27. USB online, I2C acknowledgement and successful initialization are different checks.
- Segment always lit/off: verify it is wired to the Uno, not the Nano; display commons3/8 go to ground and each segment has its own resistor.
- Wrong keypad symbols: consult the specimen-specific mapping in the Nano guide and test all keys.
- Disconnection during play: the game pauses. Restore the required stations, then resume explicitly.

See documentation/BUILD-GUIDE.md for toolchain details and documentation/EVIDENCE.md for the documented prototype limitations.
