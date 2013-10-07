/*
RFM12Pi-MQTT.js - sensors and actuators with RFM12Pi and MQTT
*/
var mqtt = require("MQTT");
var SerialPort = require("serialport").SerialPort;
var active=true;
var out="";
var state=1; // for RF input parser
// these could be command-line params
var in_topics=["run_boiler"];
var out_topics=["sensor/temp","sensor/humidity"];
var current={}; // for actuator statuses

console.log("RFM12Pi-MQTT version 0.1");

var serialPort = new SerialPort("/dev/ttyAMA0", {
  baudrate: 9600
}, false);

// RFM12Pi commands
var enb_sensors="19i210g";
var enb_actuators="1i212g";

function rfm_write(data) {
  serialPort.write(data, function(err, results) {
    if (err) {console.error("write to port error", err); active=false;}
    else console.log("sent wireless",data,"("+results+")");
  });
}

serialPort.open(function () {
  console.log("port to RFM12pi open");
  rfm_write(enb_sensors);
});

serialPort.on("close", function (data) {
  active = false;
});

var client=mqtt.createClient(1883, "localhost");

client.on("connect", function(packet) {
  console.log("connected to broker");

  // subscribes
  for (var i in in_topics) {
    client.subscribe({
        topic: in_topics[i]
    });
  }

  serialPort.open(function () {
    console.log("port to RFM12pi is open");
  });
  
  // some actuator has published to us
  client.on("message", function(packet) {
    console.log(packet.topic,packet.payload);
    var on_off=(packet.payload=="true")?1:0;
    // only send to actuator if we need to
    if (current[packet.topic] != on_off) {
      rfm_write("enb_actuators");
      rfm_write("1,1,"+on_off+"k");
      var cmd="19i210g";
      rfm_write("enb_sensors");
    }
    current[packet.topic]=on_off;
  });

  // data arrives from sensors (not filtered by RFMPi)
  // could be unrelated clutter
  serialPort.on("data", function (buf) {
    // ignore unruly traffic
    if (buf.length > 30) {
      state=1;
      return;
    }
    // filter out only the sensor we want
    // assumes some redundant data in packet
    // to make our packets recognisable
    // this needs refactoring to allow any number of sensors
    // and variable channel allocation
    var str=buf.toString();
    switch (state) {
      case 1: // look for start
        if (str == " 19 255 ") {
          out=str;
          state=2;
        } break;
      case 2: // process rest
        out+=str;
        if (buf[buf.length-1] == 10) {
          //console.log('result',out);
          var parts=out.split(" ");
          var values={};
          // could check for 255 255
          var tlsb=parseInt(parts[4],10);
          var tmsb=parseInt(parts[5],10);
          values['sensor/temp']=(tmsb*256+tlsb)/10;
          var hlsb=parseInt(parts[6],10);
          var hmsb=parseInt(parts[7],10);
          values['sensor/humidity']=(hmsb*256+hlsb)/10;
          // could check for 254 255 0d 0a
          
          var names="";
          for (var i in out_topics) {
            client.publish(out_topics[i],''+values[out_topics[i]]);
            names+=" "+out_topics[i]+"="+values[out_topics[i]];
          }
          console.log("publishing"+names);
          state=1;
        }
    }
  });
  
  // the following callbacks do not seem to work
  // despite issues raised on MQTTjs github
  client.on('publish', function(packet) {
    // need to add which sensor this was
    console.log("published",JSON.stringify(packet));
  });

  client.on("subscribe", function(packet) {
    // need to add which actuator this was
    console.log("subscribed to actuator",JSON.stringify(packet));
  });

  setInterval(function() {
    if (!active) process.exit();
  }, 1000);
});
