// 16x2 LCD station; USB serial connects it to the Pi game bridge.
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
// Known backpack address: avoid advancing auto-instance discovery on retries.
hd44780_I2Cexp lcd(0x27);
// a,b,c,d,e,f,g: Uno D2-D8, each through its own 330 ohm resistor.
const uint8_t segmentPins[]={2,3,4,5,6,7,8};
const uint8_t digitMasks[]={0x3f,0x06,0x5b,0x4f,0x66,0x6d,0x7d,0x07,0x7f,0x6f};
int8_t digit=-1,requestedDigit=-1;
bool segmentTesting=false;
uint32_t segmentTestStarted=0;
void showDigit(int8_t value){
 digit=value;
 uint8_t mask=(value>=0&&value<=9)?digitMasks[value]:0;
 for(uint8_t i=0;i<7;i++)digitalWrite(segmentPins[i],mask&(1<<i)?HIGH:LOW);
}
bool lcdReady=false;
uint8_t lcdI2cStatus=255;
int lcdInitStatus=-99;
char command[36];
uint8_t count=0;
char rows[2][17]={"DEAD CHANNEL    ","PI LINK READY   "};
uint32_t lastReport=0,lastCommand=0,lastLcdCheck=0;
void paint(){if(!lcdReady)return;for(uint8_t r=0;r<2;r++){lcd.setCursor(0,r);lcd.print(rows[r]);}}
void report(){
 Serial.print(F("{\"device\":\"dead-channel-lcd\",\"lcd\":"));Serial.print(lcdReady?F("true"):F("false"));
 Serial.print(F(",\"row1\":\""));Serial.print(rows[0]);Serial.print(F("\",\"row2\":\""));Serial.print(rows[1]);Serial.print(F("\",\"digit\":"));Serial.print(digit);Serial.print(F(",\"segmentTest\":"));Serial.print(segmentTesting?F("true"):F("false"));Serial.print(F(",\"i2cStatus\":"));Serial.print(lcdI2cStatus);Serial.print(F(",\"lcdInitStatus\":"));Serial.print(lcdInitStatus);Serial.println('}');
}
void setup(){
 for(uint8_t i=0;i<7;i++){pinMode(segmentPins[i],OUTPUT);digitalWrite(segmentPins[i],LOW);}
 pinMode(LED_BUILTIN,OUTPUT);Serial.begin(115200);Wire.begin();Wire.setWireTimeout(25000,true);
 lcdInitStatus=lcd.begin(16,2);lcdReady=lcdInitStatus==0;
 if(lcdReady){lcd.backlight();paint();}
}
void loop(){
 const uint32_t now=millis();
 if(now-lastLcdCheck>=1000){
  lastLcdCheck=now;Wire.beginTransmission(0x27);lcdI2cStatus=Wire.endTransmission();bool present=lcdI2cStatus==0;
  if(!present)lcdReady=false;
  else if(!lcdReady){lcdInitStatus=lcd.begin(16,2);lcdReady=lcdInitStatus==0;if(lcdReady){lcd.backlight();paint();}}
 }
 digitalWrite(LED_BUILTIN,now%2000<150?HIGH:LOW);
 while(Serial.available()){
  char ch=Serial.read();
  if(ch=='\n'){
   if(count==34&&command[0]=='D'&&command[17]=='|'){
    for(uint8_t r=0;r<2;r++)for(uint8_t i=0;i<16;i++){
     char v=command[1+r*17+i];rows[r][i]=(v>=32&&v<=126&&v!='"'&&v!='\\')?v:' ';
    }
    paint();lastCommand=now;report();
   }
   if(count==2&&command[0]=='S'&&(command[1]=='-'||(command[1]>='0'&&command[1]<='9'))){
    requestedDigit=command[1]=='-'?-1:command[1]-'0';if(!segmentTesting)showDigit(requestedDigit);report();
   }
   if(count==1&&command[0]=='T'){segmentTesting=true;segmentTestStarted=now;showDigit(0);report();}
   count=0;
  }else if(count<sizeof(command)-1)command[count++]=ch;
  else count=0;
 }
 if(segmentTesting){uint32_t elapsed=now-segmentTestStarted;if(elapsed<10000){int8_t value=elapsed/1000;if(value!=digit){showDigit(value);report();}}else{segmentTesting=false;showDigit(requestedDigit);report();}}
 if(lastCommand&&now-lastCommand>5000){strcpy(rows[0],"DEAD CHANNEL    ");strcpy(rows[1],"WAITING FOR GAME");paint();requestedDigit=-1;if(!segmentTesting)showDigit(-1);lastCommand=0;}
 if(now-lastReport>2000){lastReport=now;report();}
}
