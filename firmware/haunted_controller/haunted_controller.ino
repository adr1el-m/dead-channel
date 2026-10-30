// Haunted Breadboard controller: newline-delimited JSON over USB serial.
// Board labels: VRx=D32, VRy=D33, joystick SW=D27, flap=D25.
// Joystick supply must be 3V3; all controls share GND.
#include <Arduino.h>

constexpr uint8_t PIN_BUZZER = 26;
uint16_t buzzerHz = 0;
uint32_t buzzerUntil = 0;
void playBuzzer(uint8_t sound, uint32_t now) {
  const uint16_t frequencies[] = {0,1200,600,1800,300};
  const uint16_t durations[] = {0,180,200,100,250};
  if(sound>4)return;
  if(sound==0){noTone(PIN_BUZZER);digitalWrite(PIN_BUZZER,LOW);buzzerHz=0;return;}
  buzzerHz=frequencies[sound];buzzerUntil=now+durations[sound];
  tone(PIN_BUZZER,buzzerHz,durations[sound]);
}
constexpr uint8_t PIN_GREEN = 18, PIN_YELLOW = 19, PIN_RED = 23;
uint8_t ledMask = 0, requestedMask = 0;
uint32_t lastLedCommand = 0, testStarted = 0;
bool testingLeds = true;
char command[12];
uint8_t commandLength = 0;

void setLeds(uint8_t mask) {
  ledMask = mask;
  digitalWrite(PIN_GREEN, mask & 1 ? HIGH : LOW);
  digitalWrite(PIN_YELLOW, mask & 2 ? HIGH : LOW);
  digitalWrite(PIN_RED, mask & 4 ? HIGH : LOW);
}
void updateLeds(uint32_t now) {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\n') {
      command[commandLength] = 0;
      if (commandLength == 1 && command[0] == 'T') { testingLeds = true; testStarted = now; }
      if (commandLength == 2 && command[0] == 'L' && command[1] >= '0' && command[1] <= '7') {
        requestedMask = command[1] - '0'; lastLedCommand = now;
      }
      if (commandLength == 2 && command[0] == 'B' && command[1] >= '0' && command[1] <= '4') playBuzzer(command[1]-'0',now);
      commandLength = 0;
    } else if (commandLength < sizeof(command)-1) command[commandLength++] = ch;
    else commandLength = 0;
  }
  if (testingLeds) {
    uint32_t elapsed = now - testStarted;
    if (elapsed < 600) setLeds(1);
    else if (elapsed < 1200) setLeds(2);
    else if (elapsed < 1800) setLeds(4);
    else { testingLeds = false; setLeds(0); }
  } else setLeds(now-lastLedCommand < 1500 ? requestedMask : 0);
}

constexpr uint8_t PIN_KNOB = 34;
float knobFiltered = -1;
constexpr uint8_t PIN_X = 32;
constexpr uint8_t PIN_Y = 33;
constexpr uint8_t PIN_CLICK = 27;
constexpr uint8_t PIN_FLAP = 25;
constexpr uint32_t DEBOUNCE_MS = 15;
constexpr uint32_t REPORT_MS = 20;

struct Button {
  uint8_t pin;
  bool candidate = false;
  bool pressed = false;
  uint32_t changedAt = 0;

  void update(uint32_t now) {
    const bool reading = digitalRead(pin) == LOW;
    if (reading != candidate) {
      candidate = reading;
      changedAt = now;
    }
    if (now - changedAt >= DEBOUNCE_MS) pressed = candidate;
  }
};

Button flap{PIN_FLAP};
Button click{PIN_CLICK};
uint32_t lastReport = 0;
uint32_t sequence = 0;

void setup() {
  pinMode(PIN_BUZZER,OUTPUT);digitalWrite(PIN_BUZZER,LOW);
  pinMode(PIN_GREEN, OUTPUT); pinMode(PIN_YELLOW, OUTPUT); pinMode(PIN_RED, OUTPUT);
  setLeds(0); testStarted = millis();
  pinMode(PIN_FLAP, INPUT_PULLUP);
  pinMode(PIN_CLICK, INPUT_PULLUP);
  analogReadResolution(12);
  Serial.begin(115200);
}

void loop() {
  const uint32_t now = millis();
  updateLeds(now);
  if(buzzerHz && static_cast<int32_t>(now-buzzerUntil)>=0){buzzerHz=0;noTone(PIN_BUZZER);digitalWrite(PIN_BUZZER,LOW);}
  flap.update(now);
  click.update(now);
  if (now - lastReport >= REPORT_MS) {
    lastReport = now;
    int knobSum = 0;
    for (int i=0;i<8;i++) knobSum += analogRead(PIN_KNOB);
    float knob = knobSum / 8.0f;
    knobFiltered = knobFiltered < 0 ? knob : knobFiltered + .25f * (knob-knobFiltered);
    Serial.printf("{\"seq\":%lu,\"x\":%d,\"y\":%d,\"flap\":%s,\"click\":%s,\"leds\":%u,\"knob\":%d,\"buzzer\":%u}\n",
      static_cast<unsigned long>(sequence++), analogRead(PIN_X), analogRead(PIN_Y),
      flap.pressed ? "true" : "false", click.pressed ? "true" : "false", ledMask, static_cast<int>(knobFiltered), buzzerHz);
  }
  delay(1);
}
