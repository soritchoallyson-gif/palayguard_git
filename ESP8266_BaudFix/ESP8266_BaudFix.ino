// ============================================================
// ESP8266 BAUD RATE FIX - Run this ONCE, then re-upload main sketch
// This changes your ESP8266 from 115200 to 9600 permanently
// ============================================================
#include <SoftwareSerial.h>

SoftwareSerial esp(2, 3);  // RX=pin2, TX=pin3

void setup() {
  Serial.begin(9600);
  Serial.println("=== ESP8266 Baud Rate Fix ===");
  Serial.println("Starting at 115200 to talk to ESP8266...");

  esp.begin(115200);
  delay(1000);

  // Test if ESP8266 is responding at 115200
  esp.println("AT");
  delay(1500);
  String resp = readResponse();

  if (resp.indexOf("OK") >= 0) {
    Serial.println(">> ESP8266 found at 115200!");
    Serial.println(">> Changing to 9600 baud permanently...");

    // Change baud rate permanently (survives power off)
    esp.println("AT+UART_DEF=9600,8,1,0,0");
    delay(2000);
    String resp2 = readResponse();
    Serial.println("Response: " + resp2);

    // Now verify at 9600
    esp.end();
    delay(500);
    esp.begin(9600);
    delay(1000);
    esp.println("AT");
    delay(1500);
    String resp3 = readResponse();

    if (resp3.indexOf("OK") >= 0) {
      Serial.println("");
      Serial.println("===================================");
      Serial.println("SUCCESS! ESP8266 is now at 9600.");
      Serial.println("Upload your MAIN sketch now!");
      Serial.println("===================================");
    } else {
      Serial.println("!! Verification failed. Response: [" + resp3 + "]");
      Serial.println("!! Try running this sketch again.");
    }

  } else {
    Serial.println("!! ESP8266 NOT found at 115200.");
    Serial.println("!! Response was: [" + resp + "]");
    Serial.println("!! Check wiring: Pin2=ESP TX, Pin3=ESP RX, 3.3V power, CH_PD HIGH");
  }
}

void loop() {
  // Nothing - this is a one-time fix sketch
}

String readResponse() {
  String response = "";
  long start = millis();
  while (millis() - start < 2000) {
    while (esp.available()) {
      char c = esp.read();
      response += c;
      Serial.write(c);
    }
  }
  return response;
}
