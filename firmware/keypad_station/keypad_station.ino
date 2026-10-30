#include <Arduino.h>
const uint8_t rows[]={9,8,7,6},cols[]={5,4,3,2};
const char keys[4][4]={{'1','2','3','A'},{'4','5','6','B'},{'7','8','9','C'},{'*','0','#','D'}};
char candidate=0,stable=0;
bool buttonCandidate=false,button=false;
uint32_t changed=0,buttonChanged=0,lastReport=0;
char scan(){
 char result=0;uint8_t found=0;
 for(uint8_t r=0;r<4;r++){
  digitalWrite(rows[r],LOW);pinMode(rows[r],OUTPUT);delayMicroseconds(10);
  for(uint8_t c=0;c<4;c++)if(digitalRead(cols[c])==LOW){result=keys[r][c];found++;}
  pinMode(rows[r],INPUT_PULLUP);
 }
 return found==1?result:0; // Ignore ambiguous simultaneous presses.
}
void setup(){
 for(uint8_t i=0;i<4;i++){pinMode(rows[i],INPUT_PULLUP);pinMode(cols[i],INPUT_PULLUP);}
 pinMode(10,INPUT_PULLUP);Serial.begin(115200);
}
void loop(){
 const uint32_t now=millis();bool report=false;char value=scan();
 if(value!=candidate){candidate=value;changed=now;}
 if(now-changed>=25&&stable!=candidate){stable=candidate;report=true;}
 bool pressed=digitalRead(10)==LOW;
 if(pressed!=buttonCandidate){buttonCandidate=pressed;buttonChanged=now;}
 if(now-buttonChanged>=25&&button!=buttonCandidate){button=buttonCandidate;report=true;}
 if(report||now-lastReport>=100){
  lastReport=now;Serial.print(F("{\"device\":\"dead-channel-keypad\",\"key\":\""));
  if(stable)Serial.print(stable);Serial.print(F("\",\"hangup\":"));Serial.print(button?F("true"):F("false"));Serial.println('}');
 }
 delay(2);
}
