#include <SoftwareSerial.h>

SoftwareSerial esp(2, 3);  // RX=2, TX=3

// ===== CONFIGURATION =====
#define SSID      "Ohana 2.4G"
#define PASSWORD  "Irondoor@1"
#define API_KEY   "palayguard_sensor_key_2026"
#define HOST      "192.168.100.17"
#define PORT      3001
#define SENSOR_ID 1
#define DRY_VAL   786
#define WET_VAL   545

bool waitFor(const char* target, unsigned long timeout) {
  unsigned long start = millis();
  int idx = 0;
  int len = strlen(target);
  while (millis() - start < timeout) {
    while (esp.available()) {
      char c = esp.read();
      Serial.write(c);
      if (c == target[idx]) {
        if (++idx == len) return true;
      } else {
        idx = (c == target[0]) ? 1 : 0;
      }
    }
  }
  return false;
}

void flushEsp(unsigned int ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    while (esp.available()) { Serial.write(esp.read()); }
  }
}

void setup() {
  Serial.begin(9600);
  esp.begin(9600);
  Serial.println(F("\nPalayGuard Starting..."));
  delay(2000);

  Serial.println(F("Resetting ESP..."));
  esp.println(F("AT+RST"));
  waitFor("ready", 5000);
  delay(2000);

  esp.println(F("ATE0"));
  waitFor("OK", 1000);

  esp.println(F("AT+CWMODE=1"));
  waitFor("OK", 1000);

  Serial.println(F("Connecting WiFi..."));
  esp.print(F("AT+CWJAP=\"")); esp.print(F(SSID));
  esp.print(F("\",\"")); esp.print(F(PASSWORD)); esp.println(F("\""));

  if (waitFor("GOT IP", 15000)) {
    Serial.println(F("\n>> WiFi Connected!"));
  } else {
    Serial.println(F("\n!! WiFi Timeout - Continuing..."));
  }
  delay(2000);
}

void loop() {
  int raw = analogRead(A0);
  int moisture = constrain(map(raw, DRY_VAL, WET_VAL, 0, 100), 0, 100);
  Serial.print(F("\n--- Field Update ---\nRaw: ")); Serial.print(raw);
  Serial.print(F(" | Moisture: ")); Serial.print(moisture); Serial.println(F("%"));

  sendData(moisture);
  delay(20000);
}

void sendData(int moisture) {
  esp.println(F("AT+CIPSTATUS"));
  if (waitFor("busy", 500)) {
    Serial.println(F(">> ESP Busy... waiting 2s"));
    delay(2000);
  }

  esp.println(F("AT+CIPCLOSE"));
  delay(500);
  flushEsp(500);

  esp.println(F("AT+CIFSR"));
  if (!waitFor("STAIP", 3000)) {
    Serial.println(F("\n!! WiFi Lost - Reconnecting..."));
    esp.print(F("AT+CWJAP=\"")); esp.print(F(SSID));
    esp.print(F("\",\"")); esp.print(F(PASSWORD)); esp.println(F("\""));
    waitFor("GOT IP", 10000);
    return;
  }

  Serial.println(F(">> Connecting TCP..."));
  delay(1000);

  esp.print(F("AT+CIPSTART=\"TCP\",\""));
  esp.print(F(HOST));
  esp.print(F("\","));
  esp.println(PORT);

  if (!waitFor("CONNECT", 8000)) {
    Serial.println(F("\n!! TCP Failed. (Check backend/Firewall/Power)"));
    return;
  }
  Serial.println(F("\n>> TCP OK"));
  delay(500);

  char body[48];
  snprintf(body, sizeof(body), "{\"moisture\":%d,\"sensor_id\":%d}", moisture, SENSOR_ID);
  int bodyLen = strlen(body);

  char header[220];
  snprintf(header, sizeof(header),
    "POST /api/sensors/data HTTP/1.1\r\n"
    "Host: %s\r\n"
    "Content-Type: application/json\r\n"
    "x-api-key: %s\r\n"
    "Content-Length: %d\r\n"
    "Connection: close\r\n\r\n",
    HOST, API_KEY, bodyLen);

  int totalLen = strlen(header) + bodyLen;

  esp.print(F("AT+CIPSEND="));
  esp.println(totalLen);
  if (!waitFor(">", 5000)) {
    Serial.println(F("\n!! No > prompt"));
    esp.println(F("AT+CIPCLOSE"));
    return;
  }

  esp.print(header);
  esp.print(body);

  if (waitFor("200 OK", 8000)) {
    Serial.println(F("\n>> SUCCESS: Data saved to Dashboard!"));
  } else {
    Serial.println(F("\n!! No response - checking dashboard..."));
  }

  esp.println(F("AT+CIPCLOSE"));
  flushEsp(500);
}
