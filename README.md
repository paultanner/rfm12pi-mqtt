RFM12Pi-MQTT.js
===============

This is a node.js app that runs in the background, passing inputs to outputs in both directions.  This version is configured for one emonTH sensor unit (temperature and humidity) and BBSB main socket actuator (on/off).

Requires MQTT.js (not be confused with the older mqttjs).

RFM12Pi firmware is standard (see openenergymonitor.com)
emonTH firmware tweaked to include additional framing.  This is to allow other devices with ID=19 to be ignored.

See blog for how this was initially demonstrated.

This is version 0.1 - more flexible versions will appear in due course.

We have no plans to submit to NPM repo until this is done.