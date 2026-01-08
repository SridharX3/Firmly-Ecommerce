CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  specs TEXT NOT NULL,   
  status TEXT DEFAULT 'draft',
  deleted_at DATETIME DEFAULT NULL,
  delivery_options TEXT NOT NULL
    DEFAULT '["NORMAL","SPEED","EXPRESS"]', 
  image_url TEXT DEFAULT NULL
);




INSERT INTO products (id, name, price, specs, status, deleted_at, image_url) VALUES

(1,'Apple AirPods Pro (2nd Gen)',199,
'{"brand":"Apple","category":"TWS Earbuds","chip":"H2","noise_cancellation":"Active + Transparency","audio":"Spatial Audio","battery":"6h / 30h case","charging":["MagSafe","USB-C","Qi"],"water_resistance":"IPX4","bluetooth":"5.3","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/1.png'),

(2,'Samsung Galaxy Buds 2 Pro',179,
'{"brand":"Samsung","category":"TWS Earbuds","audio":"24-bit Hi-Fi","noise_cancellation":"Intelligent ANC","battery":"5h / 18h","water_resistance":"IPX7","bluetooth":"5.3","features":["360 Audio"],"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/2.png'),

(3,'Sony WF-1000XM5',199,
'{"brand":"Sony","category":"TWS Earbuds","noise_cancellation":"Best-in-class ANC","drivers":"Dynamic Driver X","battery":"8h / 24h","bluetooth":"5.3","multipoint":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/3.png'),

(4,'Sony DualSense Wireless Controller',179,
'{"brand":"Sony","category":"Gaming Controller","platform":"PlayStation 5","features":["Adaptive Triggers","Haptic Feedback"],"battery":"1560mAh","charging":"USB-C","motion_sensor":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/4.png'),

(5,'Xbox Wireless Controller',169,
'{"brand":"Microsoft","category":"Gaming Controller","platform":"Xbox / PC","connectivity":["Bluetooth","Xbox Wireless"],"battery":"AA / Rechargeable Pack","ergonomics":"Textured Grip","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/5.png'),

(6,'Xbox Elite Series 2 Controller',299,
'{"brand":"Microsoft","category":"Elite Gaming Controller","customization":"Adjustable-tension thumbsticks","battery":"40h","profiles":3,"connectivity":["Bluetooth","Xbox Wireless"],"carrying_case":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/6.png'),

(7,'Apple TV 4K (3rd Gen)',429,
'{"brand":"Apple","category":"Streaming Device","resolution":"4K HDR","chip":"A15 Bionic","storage":"128GB","audio":"Dolby Atmos","connectivity":"Wi-Fi + Ethernet","remote":"Siri Remote","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/7.png'),

(8,'NVIDIA Shield TV Pro',499,
'{"brand":"NVIDIA","category":"Streaming Device","resolution":"4K HDR","processor":"Tegra X1+","ai_upscaling":"AI-enhanced","audio":"Dolby Vision & Atmos","storage":"16GB","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/8.png'),

(9,'Apple HomePod Mini',199,
'{"brand":"Apple","category":"Smart Speaker","assistant":"Siri","audio":"360° Sound","chip":"S5","smart_home":"HomeKit","connectivity":["Wi-Fi","Bluetooth"],"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/9.png'),

(10,'Amazon Echo Studio',299,
'{"brand":"Amazon","category":"Smart Speaker","assistant":"Alexa","audio":"Dolby Atmos","drivers":"5-speaker array","smart_home":"Zigbee Hub","connectivity":["Wi-Fi","Bluetooth"],"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/10.png');

INSERT INTO products (id, name, price, specs, status, deleted_at, image_url) VALUES

(11,'Google Nest Audio Max',399,
'{"brand":"Google","category":"Smart Speaker","assistant":"Google Assistant","audio":"Room-filling sound","microphones":"Far-field","smart_home":"Nest Ecosystem","connectivity":"Wi-Fi","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/11.png'),

(12,'Nothing Ear (2)',149,
'{"brand":"Nothing","category":"TWS Earbuds","noise_cancellation":"Adaptive ANC","drivers":"11.6mm Dynamic","battery":"6.3h / 36h case","charging":["USB-C","Wireless"],"bluetooth":"5.3","codec":["LHDC","AAC"],"design":"Transparent","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/12.png'),

(13,'OnePlus Buds Pro 2',179,
'{"brand":"OnePlus","category":"TWS Earbuds","noise_cancellation":"Adaptive ANC","drivers":"Dual Dynamic Drivers","battery":"9h / 39h case","charging":["USB-C","Wireless"],"bluetooth":"5.2","spatial_audio":true,"fast_pair":"Android","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/13.png'),

(14,'Google Pixel Buds Pro',169,
'{"brand":"Google","category":"TWS Earbuds","noise_cancellation":"Active ANC","battery":"7h / 31h case","assistant":"Google Assistant","bluetooth":"5.2","water_resistance":"IPX4","multipoint":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/14.png'),

(15,'Nintendo Switch Pro Controller',179,
'{"brand":"Nintendo","category":"Gaming Controller","platform":"Nintendo Switch","battery":"40h","connectivity":"Bluetooth","features":["HD Rumble","Motion Controls"],"charging":"USB-C","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/15.png'),

(16,'8BitDo Ultimate Bluetooth Controller',159,
'{"brand":"8BitDo","category":"Gaming Controller","platform":["Switch","Windows","Android"],"battery":"22h","charging":"Dock Included","hall_effect_sticks":true,"custom_profiles":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/16.png'),

(17,'Scuf Instinct Pro Controller',299,
'{"brand":"SCUF","category":"Elite Gaming Controller","platform":"Xbox / PC","features":["Back Paddles","Trigger Stops"],"grip":"High Performance","profiles":3,"connectivity":"Wireless","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/17.png'),

(18,'Amazon Fire TV Cube (3rd Gen)',449,
'{"brand":"Amazon","category":"Streaming Device","resolution":"4K HDR","processor":"Octa-core","assistant":"Alexa Hands-Free","audio":"Dolby Atmos","ports":["HDMI","Ethernet","USB"],"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/18.png'),

(19,'Roku Streambar Pro',429,
'{"brand":"Roku","category":"Streaming Soundbar","resolution":"4K HDR","audio":"Dolby Audio","assistant":["Alexa","Google"],"subwoofer":"Wireless Ready","connectivity":"Wi-Fi","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/19.png'),

(20,'Sonos One (Gen 2)',349,
'{"brand":"Sonos","category":"Smart Speaker","audio":"Rich Room-filling Sound","assistant":["Alexa","Google"],"multiroom":true,"connectivity":"Wi-Fi","trueplay_tuning":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/20.png');

INSERT INTO products (id, name, price, specs, status, deleted_at, image_url) VALUES

(21,'Apple HomePod (2nd Gen)',399,
'{"brand":"Apple","category":"Smart Speaker","assistant":"Siri","audio":"High-excursion woofer","spatial_awareness":true,"smart_home":"Matter Support","connectivity":"Wi-Fi","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/21.png'),

(22,'Marshall Acton III',329,
'{"brand":"Marshall","category":"Smart Speaker","audio":"Signature Stereo Sound","controls":"Analog Knobs","bluetooth":"5.2","design":"Classic Marshall","connectivity":"Bluetooth","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/22.png'),

(23,'JBL Live 660NC',199,
'{"brand":"JBL","category":"Over-Ear Headphones","noise_cancellation":"Adaptive ANC","battery":"50h","fast_charge":"4h in 10min","assistant":["Alexa","Google"],"bluetooth":"5.0","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/23.png'),

(24,'Anker Soundcore Motion X600',199,
'{"brand":"Anker","category":"Portable Speaker","audio":"Spatial Audio","battery":"12h","water_resistance":"IPX7","bluetooth":"5.3","usb_c":"Charging","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/24.png'),

(25,'Logitech G Pro X Gaming Headset',199,
'{"brand":"Logitech","category":"Gaming Headset","drivers":"50mm PRO-G","mic":"Blue VO!CE","surround":"DTS Headphone:X","connectivity":"Wired USB","platforms":["PC","PS","Xbox"],"warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/25.png'),

(26,'Jabra Elite 10',189,
'{"brand":"Jabra","category":"TWS Earbuds","noise_cancellation":"Advanced ANC","drivers":"10mm","battery":"6h / 27h case","bluetooth":"5.3","multipoint":true,"water_resistance":"IP57","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/26.png'),

(27,'Sony LinkBuds S',149,
'{"brand":"Sony","category":"TWS Earbuds","noise_cancellation":"Adaptive ANC","drivers":"5mm","battery":"6h / 20h case","bluetooth":"5.2","multipoint":true,"weight":"4.8g per earbud","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/27.png'),

(28,'Beats Studio Buds+',169,
'{"brand":"Beats","category":"TWS Earbuds","noise_cancellation":"ANC + Transparency","battery":"9h / 36h case","bluetooth":"5.3","fast_pair":["iOS","Android"],"water_resistance":"IPX4","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/28.png'),

(29,'Sony DualSense Edge Controller',199,
'{"brand":"Sony","category":"Gaming Controller","platform":"PlayStation 5","features":["Back Buttons","Adjustable Triggers"],"battery":"Rechargeable","profiles":"On-board","charging":"USB-C","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/29.png'),

(30,'SteelSeries Nimbus+',179,
'{"brand":"SteelSeries","category":"Gaming Controller","platform":["Apple","PC","iOS"],"battery":"50h","connectivity":"Bluetooth","joysticks":"Clickable Thumbsticks","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/30.png');

INSERT INTO products (id, name, price, specs, status, deleted_at, image_url) VALUES

(31,'Razer Wolverine V2 Pro',299,
'{"brand":"Razer","category":"Elite Gaming Controller","platform":"PlayStation / PC","buttons":"Mecha-Tactile Action","trigger_stops":true,"connectivity":"Wireless + USB","profiles":"Custom","warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/31.png'),

(32,'Xiaomi TV Box S (2nd Gen)',429,
'{"brand":"Xiaomi","category":"Streaming Device","resolution":"4K HDR","os":"Google TV","audio":"Dolby Vision & Atmos","processor":"Quad-core","assistant":"Google Assistant","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/32.png'),

(33,'Chromecast with Google TV 4K',449,
'{"brand":"Google","category":"Streaming Device","resolution":"4K HDR","os":"Google TV","assistant":"Google Assistant","audio":"Dolby Atmos","remote":"Voice Remote","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/33.png'),

(34,'Sonos Era 100',249,
'{"brand":"Sonos","category":"Smart Speaker","audio":"Stereo Sound","bluetooth":"5.0","voice_assistants":["Alexa","Sonos Voice"],"trueplay_tuning":true,"connectivity":"Wi-Fi","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/34.png'),

(35,'Bose Home Speaker 500',349,
'{"brand":"Bose","category":"Smart Speaker","audio":"Wide Soundstage","voice_assistants":["Alexa","Google"],"display":"LCD Info Screen","connectivity":["Wi-Fi","Bluetooth"],"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/35.png'),

(36,'Harman Kardon Citation One',299,
'{"brand":"Harman Kardon","category":"Smart Speaker","audio":"High-fidelity Sound","assistant":"Google Assistant","design":"Premium Fabric","connectivity":"Wi-Fi","multiroom":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/36.png'),

(37,'Sony WH-XB910N',199,
'{"brand":"Sony","category":"Over-Ear Headphones","noise_cancellation":"Active ANC","bass":"EXTRA BASS","battery":"30h","fast_charge":"4.5h in 10min","bluetooth":"5.2","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/37.png'),

(38,'Sennheiser HD 450BT',179,
'{"brand":"Sennheiser","category":"Over-Ear Headphones","noise_cancellation":"Active ANC","audio":"High-quality Codec Support","battery":"30h","bluetooth":"5.0","foldable":true,"warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/38.png'),

(39,'HyperX Cloud Alpha Wireless',199,
'{"brand":"HyperX","category":"Gaming Headset","battery":"300h","drivers":"Dual Chamber","mic":"Detachable Noise Cancelling","connectivity":"Wireless USB","platform":"PC","warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/39.png'),

(40,'JBL Bar 2.0 All-in-One',399,
'{"brand":"JBL","category":"Soundbar","audio":"Dolby Digital","channels":"2.0","connectivity":["HDMI ARC","Bluetooth"],"mounting":"Wall Mountable","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/40.png');

INSERT INTO products (id, name, price, specs, status, deleted_at, image_url) VALUES

(41,'Anker Soundcore Liberty 4 NC',149,
'{"brand":"Anker","category":"TWS Earbuds","noise_cancellation":"Adaptive ANC 2.0","drivers":"11mm Dynamic","battery":"10h / 50h case","bluetooth":"5.3","ldac":true,"multipoint":true,"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/41.png'),

(42,'Sennheiser CX Plus True Wireless',179,
'{"brand":"Sennheiser","category":"TWS Earbuds","noise_cancellation":"Active ANC","drivers":"7mm TrueResponse","battery":"8h / 24h case","bluetooth":"5.2","codec":["aptX Adaptive","AAC"],"water_resistance":"IPX4","warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/42.png'),

(43,'PowerA Fusion Pro 3 Wired Controller',159,
'{"brand":"PowerA","category":"Gaming Controller","platform":"Xbox / PC","features":["Back Paddles","Trigger Locks"],"connectivity":"Wired USB","audio":"3.5mm Jack","custom_profiles":true,"warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/43.png'),

(44,'Nacon Revolution Unlimited Pro',199,
'{"brand":"Nacon","category":"Gaming Controller","platform":"PlayStation / PC","features":["Weight Tuning","Custom Profiles"],"connectivity":["Bluetooth","USB"],"battery":"7h","software":"PC Companion App","warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/44.png'),

(45,'Roku Ultra 4K HDR',449,
'{"brand":"Roku","category":"Streaming Device","resolution":"4K HDR","formats":["Dolby Vision","HDR10+"],"remote":"Voice Remote Pro","connectivity":["Wi-Fi 6","Ethernet"],"storage":"MicroSD Support","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/45.png'),

(46,'Mecool KM2 Plus Deluxe',479,
'{"brand":"Mecool","category":"Streaming Device","resolution":"4K HDR","os":"Android TV 11","certification":"Netflix Certified","audio":"Dolby Atmos","ports":["HDMI","USB","Ethernet"],"warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/46.png'),

(47,'Bang & Olufsen Beosound A1 (2nd Gen)',299,
'{"brand":"Bang & Olufsen","category":"Smart Speaker","audio":"360-degree Sound","assistant":"Alexa","battery":"18h","water_resistance":"IP67","bluetooth":"5.1","design":"Premium Aluminum","warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/47.png'),

(48,'Denon Home 250',399,
'{"brand":"Denon","category":"Smart Speaker","audio":"Hi-Fi Stereo","assistant":["Alexa","Google"],"multiroom":"HEOS Built-in","connectivity":["Wi-Fi","Bluetooth"],"design":"Minimal","warranty":"1 Year"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/48.png'),

(49,'Audio-Technica ATH-M50xBT2',199,
'{"brand":"Audio-Technica","category":"Over-Ear Headphones","audio":"Studio-grade Sound","battery":"50h","bluetooth":"5.2","codec":["LDAC","AAC"],"multipoint":true,"wired_mode":true,"warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/49.png'),

(50,'Corsair HS80 RGB Wireless',199,
'{"brand":"Corsair","category":"Gaming Headset","audio":"Dolby Atmos","mic":"Broadcast-grade Omni-directional","battery":"20h","connectivity":"Wireless USB","rgb":"Subtle RGB","platform":"PC","warranty":"2 Years"}',
'active',NULL,'https://pub-de083c8f925e42d081fb0a85f95eb1c7.r2.dev/product-images/50.png');

