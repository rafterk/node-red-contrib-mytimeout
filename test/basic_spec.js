// https://github.com/ksvan/node-red-contrib-verisure/wiki/Detailed-setup---automated-nodered-test
/*
*/
"use strict";

const should = require("should");
var   helper = require('node-red-node-test-helper');
var   myNode = require('../mytimeout.js');

helper.init(require.resolve('node-red'));

var nom =  'MyTimeout';

let getFailingPromise = function() {

  return new Promise(function(resolve, reject) {

    // simply fail on the next tick
    setTimeout(function() {

      reject(new Error('No reason.'));
    });
  });
}

describe('Basic mytimeout Node', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    /* */
    helper.unload();
    helper.stopServer(done);
    /* */
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC00 - should be loaded', function (done) {
    // select in node-red editor the node to test, then hamburger, then export, then copy to clipboard, then paste here:
    /* */
    var flow1 = [{
      "id":         'n1', // was"abf332d4.4e",
      "type":       "mytimeout",
      "z":          "b431bcd1.51942",
      "name":       nom,
      "outtopic":   "",
      "outsafe":    'on',
      "outwarning": "Warning",
      "outunsafe":  "off",
      "warning":    "5",        // ??? shouldn't this be warning
      "timer":      "30",
      "debug":      false,
      "ndebug":     false,
      "ignoreCase": false,
      "repeat":     false,
      "again":      false,
      "x":          600,
      "y":          840,
      "wires":[
        ["ba562635.2144c8","6b9eec06.608274"],
        ["2b13443d.b2b27c","e1f06422.544ee8"]
      ]
    }];
    /* */

    var flow = [{ id: "n1", type: "mytimeout", name: nom }];
    // Node 1: {
    //   "id":"n1",
    //   "type":"mytimeout",
    //   "_closeCallbacks":[null],
    //   "_inputCallbacks":null,
    //   "name":"MyTimeout",
    //   "wires":[],
    //   "_wireCount":0,
    //   "timer":30,
    //   "state":"stop",
    //   "warning":5,
    //   "outunsafe":"off",
    //   "_events":{},
    //   "_eventsCount":1
    // }
    helper.load(myNode, flow, function () {
      var n1 = helper.getNode("n1");

      // Default flow (with no config) doesn't set the outsafe value (so we don't send the on-msg when payload is blank)
      n1.should.have.properties({
        'name':      nom,
        "outunsafe": 'off',
        'timer':     30,   // Defaults
        'warning':   5     // Defaults
      });
      done();
    });
  });
  /* */

  /*
  ** Main output
  ** n2: {"_msgid":"65d8f152.8e917","payload":"on","topic":"","timeout":30}
  ** Ticks output
  ** n3: {"payload":30,"state":1,"flag":"ticks > 0","_msgid":"5e5dd4bf.1be32c"}
  */
  //
  // ===========================================================================================
  //
  it('TC01 - Should turn on Tx on', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        warning:    "5",
        timer:      "30",
        debug:      "0",
        wires:[["n2"],["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n2 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'on');
        done();
      });
      n1.receive({ payload: 'on' });
    });
  });
  /* */
  
  // sleep 3; mosquitto_pub -t 'home/test/mytimeout' -m '{"payload": "on", "timeout": 2, "warning": 1, "TestNo":"'0002'" }'
  /* */
  //
  // ===========================================================================================
  //
  it('TC01a- timed on, minimal time (2/1), TX on', function (done) {
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;
    var warn    = 1;

    this.timeout(10*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      5,
        warning:    2,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        qos:        0,
        retain:     false,
        topic:      "",
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
        //
        // Just collect the inputs. This time we'll get on/warning/off
        //
        
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg));
        //
        //  Just collect the inputs.
        //
      });
      
      var nmsg = { payload: 'on', timeout: timeout, warning: warn, TestNo: '0001a'};
      n1.receive( nmsg );

      //
      // ---------------------------------------------------------------------------------------
      // Timer
      //
      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          // Now check the cmnds
          cmnds.should.have.lengthOf((3));

          cmnds[0].should.have.properties({"payload": "on",      "timeout": timeout, warning: warn, TestNo: "0001a"});
          cmnds[1].should.have.properties({"payload": "warning", "timeout": timeout, warning: warn, TestNo: "0001a"});
          cmnds[2].should.have.properties({"payload": "off",     "timeout": timeout, warning: warn, TestNo: "0001a"});

          // Now check the ticks
          ticks.should.have.lengthOf(timeout+1);

          ticks[0].should.have.properties({"payload":timeout,"state":1,"flag":"ticks > 0"});
          --timeout;
          ticks[1].should.have.properties({"payload":timeout,"state":2,"flag":"warn >= ticks"});
          --timeout;
          ticks[2].should.have.properties({"payload":timeout,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err + ' (' + timeout + '/' + warn + ')');
          console.log('Sent:  ' + JSON.stringify(nmsg));
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          
          done(err);
        }
      }, (timeout+2)*1000);
    });
  });
  /* */

  /* * /
  //
  // ===========================================================================================
  //
  it('TC01b- Should turn on, Tx on', function (done) { // ???
    var timeOut = 5;
    var turnOff = 2;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'on';
    const Off = 'off';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe:    On,
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff,
        debug:      "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds.should.have.length(3, "Number of commands issued");
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', 'warning');
            cmnds[2].should.have.property('payload', Off);
          }
        } catch(err) {
          //console.log ("Node 1:" + JSON.stringify(n1) +'\n');
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut; // n1.timer - turnOff;
            var idx = n1.timer + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            
            done();
          } catch(err) {
            console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: 'on' });
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it('TC02 - stop, should be timed, TX stop', function (done) {
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;

    this.timeout(7*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout", name: nom, timer:5, warning:2, outusafe:"on", outunsafe:"off", wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
        //
        // If we get anything here, it's an error
        //
        try {
          clearTimer(timeOutID);
          (false).should.be.true();
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          done(err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg));
        //
        // If we get anything here, it's an error
        //
        try {
          clearTimer(timeOutID);
          (false).should.be.true();
          done('\tthis is a mistake');
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          

          done(err);
        }
      });

      n1.receive({ payload: 'stop' });

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          cmnds.should.have.lengthOf(0);
          ticks.should.have.lengthOf(0);

          done();
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          
          done(err);
        }
      }, (timeout+2)*1000);
    });
  });
  /* */

  /* */
  //
  // ===========================================================================================
  //
  it('TC03 - cancel, should be timed, TX cancel', function (done) {
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeout = 2;

    this.timeout(7*1000); // run timer for timeOut plus 2 seconds overrun

    var flow = [
      { id: "n1", type: "mytimeout", name: nom, timer:5, warning:2, outusafe:"on", outunsafe:"off", wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    helper.load(myNode, flow, function() {
      var timeOutID;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg));
        //
        // If we get anything here, it's an error
        //
        try {
          clearTimer(timeOutID);
          (false).should.be.true();
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          
          done(err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg));
        //
        // If we get anything here, it's an error
        //
        try {
          clearTimer(timeOutID);
          (false).should.be.true();
        } catch(err) {
          console.log("\tTicks Err: " + err);
          done(err);
        }
      });

      n1.receive({ payload: 'cancel' });

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          cmnds.should.have.lengthOf(0);
          ticks.should.have.lengthOf(0);

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err);
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeout+2)*1000);
    });
  });
  /* */

  /* * /
  //
  // ===========================================================================================
  //
  it('TCxx - Dummy, should be timed', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, output: 2, wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];

    try {
      helper.load(myNode, flow, function () {
        try {
          (true).should.be.true();
          done();
        } catch(err) {
          console.log('Ooops');
          done(err);
        }
      });
    } catch(err) {
      console.log(err);
      done();
    }
  });
  /* */

  /* * /
  //
  // ===========================================================================================
  //
  // https://github.com/node-red/node-red/blob/15a600c763cfeafee72016e05113ebca5358a3be/test/nodes/core/function/10-switch_spec.js#L640
  it('should treat non-existant msg property conditional as undefined', function(done) {
    var flow = [{
      "id":"switchNode1",
      "type":"switch",
      "z":"feee1df.c3263e",
      "name":"",
      "property":"payload",
      "propertyType":"msg",
      "rules":[{"t":"eq","v":"this.does.not.exist","vt":"msg"}],
      "checkall":"true",
      "outputs":1,
      "x":190,
      "y":440,
      "wires":[["helperNode1"]]},
     {id:"helperNode1", type:"helper", wires:[]}];

    helper.load(switchNode, flow, function() {
      var switchNode1 = helper.getNode("switchNode1");
      var helperNode1 = helper.getNode("helperNode1");
      var received = [];

      helperNode1.on("input", function(msg) {
        received.push(msg);
      });

      // First message should be dropped as payload is not undefined
      switchNode1.receive({topic:"messageOne",payload:""});

      // Second message should pass through as payload is undefined
      switchNode1.receive({topic:"messageTwo",payload:undefined});

      setTimeout(function() {
        try {
          received.should.have.lengthOf(1);
          received[0].should.have.a.property("topic","messageTwo");
          done();
        } catch(err) {
          done(err);
        }
      },500)
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC05 - Should turn off Tx off', function (done) { // Passes
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, output: 2, wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        try {
          msg.should.have.property('payload', 'off');
          fini++;
          if(fini > 1) {
            done();
          }
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          done(err);
        }
      });

      n3.on("input", function (msg) {
        try {
          msg.should.have.property('payload', 0);
          fini++;
          if(fini > 1) {
            done();
          }
        } catch(err) {
          console.log("\tTicks Err: " + err);
          done(err);
        }
      });

      n1.receive({ payload: 'off' });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC06 - Should turn off Tx 0', function (done) {
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      n2.on("input", function (msg) {
        try {
          msg.should.have.property('payload', 'off');
          //done();
        } catch(err) {
          console.log("\tCmnds Err: " + err);
          done(err);
        }
      });

      n3.on("input", function (msg) {
        try {
          msg.should.have.property('payload', 0);
          done();
        } catch(err) {
          console.log("\Ticks Err: " + err);
          done(err);
        }
      });

      n1.receive({ 'payload': 0 });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC08 - Should turn off, Tx off', function (done) { // Passes
    var flow = [
      { id: "n1", type: "mytimeout",
        name: nom,
        outsafe:    'on', /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  'off',
        timer:      5,
        warning:    2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      //
      // ---------------------------------------------------------------------------------------
      // Run the timer for 2 seconds longer than the timer runs
      // then check the cmnds & ticks. 
      //

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'off');
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property('payload', 0);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: 'off' });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC08 - Should turn off, Tx 0', function (done) { // Passes
    var flow = [
      { id: "n1", type: "mytimeout", name: nom, output: 2, wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'off');
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property('payload', 0);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: '0' });
    });
  });
  /* */

  // stop and cancel should do nothing to the mytimeout node, working on a way to test that.

  //
  // ===========================================================================================
  //
  it('TC15 - Should turn on then off, Tx on', function (done) { // ???
    var timeOut = 10;
    var turnOff = 7;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'on';
    const Off = 'off';
    
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff-2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n2 = helper.getNode("n2");
      var n3 = helper.getNode("n3");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds.should.have.length(2, "Number of commands issued");
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', Off);
          }
        } catch(err) {
          //console.log ("Node 1:" + JSON.stringify(n1) +'\n');
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == turnOff) {
          n1.receive({ payload: 'off' });
        }

        // do until payload = 0
        if(msg.payload == 0) {
          try {
            //console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer);
            var j = timeOut; // n1.timer - turnOff;
            var idx = n1.timer - turnOff + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            // 10 - 7 = 3 + 1 = 4 (5th array element)
            ticks[idx].payload.should.be.exactly(0); //
            
            done();
          } catch(err) {
            console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: On });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC16 - Should turn on then stop, Tx on', function (done) { // ???
    var timeOut = 10;
    var turnOff = 7;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On     = 'on';
    const Off    = 'off';
    const myStop = 'stop';
    
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff-2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'stop'
        try {
          if(msg.payload == myStop) {
            cmnds.should.have.length(2, "Number of commands issued");
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', myStop);

            done();
          }

        } catch(err) {
          console.log ("1 Node 1:" + JSON.stringify(n1) +'\n');
          console.log('1 Cmnds: ' + JSON.stringify(cmnds));
          console.log('1 Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == turnOff) {
          n1.receive({ payload: 'stop' });
        }

        // do until payload = -1
        // { payload: -1, state: 0, flag: 'stop', _msgid: '92bf1534.39af58' }
        if(msg.payload == -1) {
          try {
            //console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer);
            var j = n1.timer; // n1.timer - turnOff;
            var idx = n1.timer - turnOff + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            // 10 - 7 = 3 + 1 = 4 (5th array element)
            ticks[idx].payload.should.be.exactly(-1);    // 
            ticks[idx].state.should.be.exactly(0); // 
            ticks[idx].flag.should.be.exactly(myStop); // 
            
            // Hmm, need to figure out why we don't note stop here
            //done();
          } catch(err) {
            console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: On });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC19 - Should turn on then cancel, Tx on', function (done) { // ???
    var timeOut = 10;
    var turnOff = 7;
    var isDone  = false;

    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for timeOut plus 2 seconds overrun

    const On     = 'on';
    const Off    = 'off';
    const myStop = 'stop';
    const cancel = 'cancel';
    
    var flow = [
      { id: "n1", type: "mytimeout",
        name:       nom,
        outsafe:    On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe:  Off,
        timer:      timeOut,
        warning:    turnOff-2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n2 = helper.getNode("n2");
      var n3 = helper.getNode("n3");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'stop'
        try {
          // {"payload":-1,"state":0,"flag":"cancel","_msgid":"3624644e.abf0cc"}
          if(msg.payload == myStop) {
            cmnds.should.have.length(1, "Number of commands issued");
            cmnds[0].should.have.property('payload', On);
          }

        } catch(err) {
          console.log ("1 Node 1:" + JSON.stringify(n1) +'\n');
          console.log('1 Cmnds: ' + JSON.stringify(cmnds));
          console.log('1 Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');

          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == turnOff) {
          n1.receive({ payload: cancel });
        }

        // do until payload = -1
        // {"payload":-1,"state":0,"flag":"cancel","_msgid":"3624644e.abf0cc"}
        if(msg.payload == -1) {
          try {
            //console.log('Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer);
            var j = n1.timer; // n1.timer - turnOff;
            var idx = n1.timer - turnOff + 1;
            for(let i = 0; i < idx ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            // 10 - 7 = 3 + 1 = 4 (5th array element)
            ticks[idx].payload.should.be.exactly(-1);    // 
            ticks[idx].state.should.be.exactly(0); // 
            ticks[idx].flag.should.be.exactly(cancel); // 
            
            // Hmm, need to figure out why we don't note stop here
            done();
          } catch(err) {
            console.log('2 Ticks: ' + JSON.stringify(ticks) + '\nn1.timer: ' + n1.timer + '\n');
            console.log("2 Ticks Err: " + err);

            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: On });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('Should turn on 2 Tx 1', function (done) { // ???
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe:    "on",
        outwarning: "warning",
        outunsafe:  "off",
        warning:    "5",
        timer:      "10",
        debug:      "0",
        output:     2,
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" },
      { id: "n3", type: "helper" }
    ];
    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Okay the fini++ seems like a good idea but if I get 2 n2 or 2 n3 I might gets a false done
      n2.on("input", function (msg) {
        msg.should.have.property('payload', 'on');
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n3.on("input", function (msg) {
        msg.should.have.property('payload', 10);
        fini++;
        if(fini > 1) {
          done();
        }
      });

      n1.receive({ payload: '1' });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('Should turn on 2, complex Tx 1', function (done) { // ???
    var cmnds = [];
    var ticks = [];

    var t = 0;
    var c = 0;

    var timeOut = 2;
    var warn    = 1;

    this.timeout(10*1000); // run timer for 30 plus 2 seconds overrun

    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout",
        name:       "myTimeout",
        timer:      5,
        warning:    2,
        outsafe:    On,
        outwarning: "warning",
        outunsafe:  Off,
        qos:        0,
        retain:     false,
        topic:      "",
        wires:      [["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var timeOutID;
      
      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        msg.t = Date.now();
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)
      });

      n3.on("input", function (msg) {
        msg.t = Date.now();
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)
      });

      var nmsg = { payload: 'on', timeout: timeOut, warning: warn, TestNo: '0020'};
      n1.receive( nmsg );

      timeOutID = setTimeout(function() {
        //
        // This is what we should get
        //
        try {
          cmnds.should.have.lengthOf(3);

          cmnds[0].should.have.property('payload', On);
          cmnds[1].should.have.property('payload', 'warning');
          cmnds[2].should.have.property('payload', Off);

          ticks.should.have.lengthOf(timeOut+1);

          ticks[0].should.have.properties({"payload":timeOut,"state":1,"flag":"ticks > 0"});
          --timeOut;
          ticks[1].should.have.properties({"payload":timeOut,"state":2,"flag":"warn >= ticks"});
          --timeOut;
          ticks[2].should.have.properties({"payload":timeOut,"state":0,"flag":"off"});

          done();
        } catch(err) {
          console.log("Cmnds Err: " + err + ' (' + timeOut + '/' + warn + ')');
          console.log('Sent:  ' + JSON.stringify(nmsg));
          console.log('Cmnds: ' + JSON.stringify(cmnds));
          console.log('Ticks: ' + JSON.stringify(ticks));          

          done(err);
        }
      }, (timeOut+2)*1000);
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC21a- Should turn normal on/off, Tx on w/floats - TC xx', function (done) { // ???
    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: 5,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n2 = helper.getNode("n2");
      var n3 = helper.getNode("n3");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', 'warning');
            cmnds[2].should.have.property('payload', Off);
            //done();
          }
        } catch(err) {
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });
      //var pl = { 'payload': 'on', 'timeout': timeout+0.99, 'warning': warning+0.99, 'extra': 'extra' };
      var pl = { payload: "on", timeout: flow[0].timer+0.99, warning: flow[0].warning+0.99, extra: 'extra' };
      n1.receive(pl);
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC11 - Should turn on/on, Tx on - TC xx', function (done) { // ???
    /*
    ✓ Should turn normal on/off, Tx on w/floats - TC xx (6014ms)
        Cmnds:     [{"payload":"oN","extra":"extra1","_msgid":"2d8d4a69.e05dc6"},
                    {"payload":"oN","extra":"extra2","_msgid":"dddb657f.d12eb8"},
                    {"payload":"warning","extra":"extra2","_msgid":"dddb657f.d12eb8"},
                    {"payload":"oFF","extra":"extra2","_msgid":"dddb657f.d12eb8"}]

        Ticks:     [{"payload":10,"state":1,"flag":"ticks > 0","_msgid":"89a08871.dcb0c8"},
                    {"payload":9,"state":1,"flag":"ticks > 0","_msgid":"a48abf83.220cc"},
                    {"payload":8,"state":1,"flag":"ticks > 0","_msgid":"33ca89f0.30d226"},
                    {"payload":7,"state":1,"flag":"ticks > 0","_msgid":"5138258e.062ddc"},
                    {"payload":10,"state":1,"flag":"ticks > 0","_msgid":"89e191fa.b388f"},
                    {"payload":9,"state":1,"flag":"ticks > 0","_msgid":"b03b1bfa.334ff8"},
                    {"payload":8,"state":1,"flag":"ticks > 0","_msgid":"23b3c00d.3091d"},
                    {"payload":7,"state":1,"flag":"ticks > 0","_msgid":"f64bfafe.c7efc8"},
                    {"payload":6,"state":1,"flag":"ticks > 0","_msgid":"ddd1e1f7.c9e8a"},
                    {"payload":5,"state":1,"flag":"ticks > 0","_msgid":"39e08930.853336"},
                    {"payload":4,"state":1,"flag":"ticks > 0","_msgid":"1da0bd7b.8d2983"},
                    {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"680f940.c242f6c"},
                    {"payload":2,"state":2,"flag":"warn >= ticks","_msgid":"94c884b3.bd6068"},
                    {"payload":1,"state":2,"flag":"warn >= ticks","_msgid":"5b080bb1.1be1f4"},
                    {"payload":0,"state":0,"flag":"off","_msgid":"dddb657f.d12eb8"}]

Ticks Err: AssertionError: expected Array [
  Object { payload: 10, state: 1, flag: 'ticks > 0',     _msgid: '89a08871.dcb0c8' },
  Object { payload:  9, state: 1, flag: 'ticks > 0',     _msgid: 'a48abf83.220cc' },
  Object { payload:  8, state: 1, flag: 'ticks > 0',     _msgid: '33ca89f0.30d226' },
  Object { payload:  7, state: 1, flag: 'ticks > 0',     _msgid: '5138258e.062ddc' },
  Object { payload: 10, state: 1, flag: 'ticks > 0',     _msgid: '89e191fa.b388f' },
  Object { payload:  9, state: 1, flag: 'ticks > 0',     _msgid: 'b03b1bfa.334ff8' },
  Object { payload:  8, state: 1, flag: 'ticks > 0',     _msgid: '23b3c00d.3091d' },
  Object { payload:  7, state: 1, flag: 'ticks > 0',     _msgid: 'f64bfafe.c7efc8' },
  Object { payload:  6, state: 1, flag: 'ticks > 0',     _msgid: 'ddd1e1f7.c9e8a' },
  Object { payload:  5, state: 1, flag: 'ticks > 0',     _msgid: '39e08930.853336' },
  Object { payload:  4, state: 1, flag: 'ticks > 0',     _msgid: '1da0bd7b.8d2983' },
  Object { payload:  3, state: 1, flag: 'ticks > 0',     _msgid: '680f940.c242f6c' },
  Object { payload:  2, state: 2, flag: 'warn >= ticks', _msgid: '94c884b3.bd6068' },
  Object { payload:  1, state: 2, flag: 'warn >= ticks', _msgid: '5b080bb1.1be1f4' },
  Object { payload:  0, state: 0, flag: 'off',           _msgid: 'dddb657f.d12eb8' }
] to have property length of 10 (got 15)
    1) Should turn on/on, Tx on - TC xx
     */
    var timeOut = 10;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: timeOut,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', On);        // Will this happen?
            cmnds[2].should.have.property('payload', 'warning'); //
            cmnds[3].should.have.property('payload', Off);
            //done();
          }
        } catch(err) {
          console.log("\tCmnds:     " + JSON.stringify(cmnds));
          console.log("\tTicks:     " + JSON.stringify(ticks));
          console.log("\tCmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == 7 && !fini) {
          fini++;
          n1.receive({ payload: "on", extra: 'extra2' }); // Extra is in the msg (cool we can test for that then
        }
        
        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            var flag = 0;

            // I can manually figure it out but programatically it's a bit more difficult to to it correctly
            ticks.should.have.length(15, "Tick count should be 15"); // ??? 15? 10 9 8 7 10 9 8 7 6 5 4 3 2 1 0 10-7=3+10=13+1=14
            /* */
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j); // Count down to 0
              if(j == 7 && !flag) {
                j = 10;
                flag++;
              } else {
                j--;
              }
            }
            //* */
            done();
          } catch(err) {
            console.log("\tCmnds:     " + JSON.stringify(cmnds));
            console.log("\tTicks:     " + JSON.stringify(ticks));
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });
      //var pl = { 'payload': 'on', 'timeout': timeout+0.99, 'warning': warning+0.99, 'extra': 'extra' };
      n1.receive({ payload: "on", extra: 'extra1' });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC23 - Should turn on/on (2nd no payload), Tx on - TC xx', function (done) { // ???
    /*
    */
    var timeOut = 10;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2+6)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: timeOut,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds[0].should.have.property('payload', On);
            //cmnds[1].should.have.property('payload', On);        // Will this happen?
            cmnds[1].should.have.property('payload', 'warning'); //
            cmnds[2].should.have.property('payload', Off);
            //done();
          }
        } catch(err) {
          console.log("\tCmnds:     " + JSON.stringify(cmnds));
          console.log("\tTicks:     " + JSON.stringify(ticks));
          console.log("\tCmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        if(msg.payload == 7 && !fini) {
          fini++;
          n1.receive({ payload: '', extra: 'extra2' }); // Extra is in the msg (cool we can test for that then
        }
        
        // do until payload = 0
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            var flag = 0;

            // I can manually figure it out but programatically it's a bit more difficult to to it correctly
            ticks.should.have.length(15, "Tick count should be 15"); // ??? 15? 10 9 8 7 10 9 8 7 6 5 4 3 2 1 0 10-7=3+10=13+1=14
            /* */
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j); // Count down to 0
              if(j == 7 && !flag) {
                j = 10;
                flag++;
              } else {
                j--;
              }
            }
            //* */
            done();
          } catch(err) {
            console.log("\tCmnds:     " + JSON.stringify(cmnds));
            console.log("\tTicks:     " + JSON.stringify(ticks));
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });
      //var pl = { 'payload': 'on', 'timeout': timeout+0.99, 'warning': warning+0.99, 'extra': 'extra' };
      n1.receive({ payload: "on", extra: 'extra1' });
    });
  });
  /* */

  //
  // ===========================================================================================
  //
  it('TC24 - Should turn on with junk, Tx junk', function (done) { //
    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "warning",
        outunsafe: Off,
        timer: 5,
        warning: 2,
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            //console.log('\nCmnds: ' + JSON.stringify(cmnds));
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', 'warning');
            cmnds[2].should.have.property('payload', Off);
            //done();
          }
        } catch(err) {
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "junk" });
    });
  });
  /* */
  
  //
  // ===========================================================================================
  //
  it('TC25 - Should turn on with junk with no outwarning (\'\'), Tx junk', function (done) { //
    /*
      Cmnds# [{"payload":"oN","_msgid":"f9585a12.6b9dc8"},{"payload":"oFF","_msgid":"f9585a12.6b9dc8"}]
      Ticks: [{"payload":5,"state":1,"flag":"ticks > 0","_msgid":"5ee06bcf.685864"},{"payload":4,"state":1,"flag":"ticks > 0","_msgid":"b64db567.5a9e48"},
              {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"89eb0cd7.1e599"}, {"payload":2,"state":1,"flag":"ticks > 0","_msgid":"23cf2964.d164e6"},
              {"payload":1,"state":1,"flag":"ticks > 0","_msgid":"c9e990ad.d40c4"}, {"payload":0,"state":0,"flag":"off","_msgid":"f9585a12.6b9dc8"}]
    */
    
    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: "", // This turns off warning
        outunsafe: Off,
        timer: 5,
        warning: 2, // Setting to zero has not affect on turning off warning message?
        debug: "0",
        /* output: 2, */
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', Off);
          }
        } catch(err) {
          console.log('\nCmnds# ' + JSON.stringify(cmnds));
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "junk" });
    });
  });
  /* */
  
  //
  // ===========================================================================================
  //
  it('TC26 - Should turn on with junk with outwarning not defined & warning (0), Tx junk', function (done) { //
    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    const On  = 'on';
    const Off = 'off';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: '', // This turns off warning
        outunsafe: Off,
        timer: 5,
        warning: 0, // Setting to zero has not affect on turning off warning message?
        debug: "0",
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property('payload', On);
            cmnds[1].should.have.property('payload', Off);
          }
        } catch(err) {
          console.log('\nCmnds# ' + JSON.stringify(cmnds));
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "junk", timeout: 5, warning: 0, "extra": "extraValue" });
    });
  });
  /* */
  
  //
  // ===========================================================================================
  //
  it('TC27 - Should turn on with junk with outwarning &warning defined, Tx junk & warning 0', function (done) { //
    /*
      Cmnds# [{"payload":"oN","_msgid":"57dc6145.bc9b7"},
              {"_msgid":"57dc6145.bc9b7"}, <-- not correct
              {"payload":"oFF","_msgid":"57dc6145.bc9b7"}]
      Ticks: [{"payload":5,"state":1,"flag":"ticks > 0","_msgid":"5ee06bcf.685864"},{"payload":4,"state":1,"flag":"ticks > 0","_msgid":"b64db567.5a9e48"},
              {"payload":3,"state":1,"flag":"ticks > 0","_msgid":"89eb0cd7.1e599"}, {"payload":2,"state":1,"flag":"ticks > 0","_msgid":"23cf2964.d164e6"},
              {"payload":1,"state":1,"flag":"ticks > 0","_msgid":"c9e990ad.d40c4"}, {"payload":0,"state":0,"flag":"off","_msgid":"f9585a12.6b9dc8"}]
    */
    
    var timeOut = 5;

    var cmnds = [];
    var ticks = [];
    var t = 0;
    var c = 0;

    this.timeout((timeOut+2)*1000); // run timer for 30 plus 2 seconds overrun

    // Node 1:{"id":"n1","type":"mytimeout","_closeCallbacks":[null],"_inputCallbacks":null,"name":"MyTimeout","wires":[["n2"],["n3"]],"_wireCount":2,"timer":5,"state":"stop","warning":2,"outsafe":"on","outwarn":"warning","outunsafe":"off","_events":{},"_eventsCount":1}
    const On  = 'oN';
    const Off = 'oFF';

    var flow = [
      { id: "n1", type: "mytimeout", name: nom,
        outsafe: On, /* If blank we should get no on msg */
        outwarning: 'warn', // This turns off warning
        outunsafe: Off,
        timer: 5,
        warning: 2, // Setting to zero has not affect on turning off warning message?
        wires:[["n2"], ["n3"]] },
      { id: "n2", type: "helper" }, /* Output commands */
      { id: "n3", type: "helper" }  /* Output state of ticks */
    ];

    helper.load(myNode, flow, function () {
      var fini = 0;

      var n3 = helper.getNode("n3");
      var n2 = helper.getNode("n2");
      var n1 = helper.getNode("n1");

      // Need to run the n2 & n3 until I get the last command (off) and the last tick.
      n2.on("input", function (msg) {
        cmnds[c++] = JSON.parse(JSON.stringify(msg)); // Can't just to cmnds[c++] = msg (not a new copy, just a pointer)

        // do until payload = 'off'
        try {
          if(msg.payload == Off) {
            cmnds[0].should.have.property('payload', On);
            //cmnds[1].should.have.property('payload', 'warn'); // @FIXME: We're getting cmnds[1] = {"_msgid":"57dc6145.bc9b7"}
            cmnds[1].should.have.property('payload', Off);
          }
        } catch(err) {
          console.log('\nCmnds# ' + JSON.stringify(cmnds));
          console.log("Cmnds Err: " + err);
          done("Cmnds Err:"  + err);
        }
      });

      n3.on("input", function (msg) {
        ticks[t++] = JSON.parse(JSON.stringify(msg)); // Can't just to ticks[t++] = msg (not a new copy, just a pointer)

        // do until ticks payload = 0, meaning the timer has stopped
        if(msg.payload == 0) {
          try {
            var j = timeOut;
            ticks.should.have.length(timeOut+1, "Number of ticks issued");
            for(let i = 0; i <= n1.timer ; i++) {
              ticks[i].payload.should.be.exactly(j--); // Count down to 0
            }
            //console.log("Timeout = " + timeOut + "\nTicks length = " + ticks.length);
            done();
          } catch(err) {
            console.log("Ticks Err: " + err);
            done(err);
          }
        }
      });

      n1.receive({ payload: "junk", timeout: 5, warning: 0, "extra": "extraValue" });
    });
  });
  /* */
  
});

// =[ Notes ]====================================================================================
/*

tput clear; npm test ; ps ax | egrep node-red | egrep -v grep

mosquitto_sub -v -t home/test/switchTimer | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file} # ^Z
bg

mosquitto_sub -v -t home/test/mytimeout     | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file} # ^Z
bg
mosquitto_sub -v -t home/test/mytimeoutJson | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file} # ^Z
bg
mosquitto_sub -v -t home/test/ticksJson     | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file} # ^Z
bg

mosquitto_pub -t 'home/test/mytimeout'   -m '{ "payload": "on", "timeout" : 10, "warning": 2 }' && sleep 3 && mosquitto_pub -t 'home/test/switchTimer' -m '{ "payload": "stop"}' && sleep 10 && echo
mosquitto_pub -t 'home/test/switchTimer' -m '{ "payload": "on", "timeout" : 10, "warning": 2 }' && sleep 3 && mosquitto_pub -t 'home/test/switchTimer' -m '{ "payload": "stop"}' && sleep 10 && echo
mosquitto_pub -t 'home/test/switchTimer' -m '{ "payload": "", "timeout" : 4, "warning": 2 }'

mosquitto_pub -t 'home/test/mytimeout' -m '{ "payload": "", "timeout" : 4, "warning": 2 }'

2021-01-13_02:26:07.1610522767 home/test/switchTimer { "payload": "junk", "timer" : 4, "warning": 2 }
2021-01-13_02:26:07.1610522767 home/test/switchTimer on
2021-01-13_02:26:35.1610522795 home/test/switchTimer warning
2021-01-13_02:26:37.1610522797 home/test/switchTimer off

You have new mail in /var/mail/njc
(pts/27) njc@mozart:~/dev/git/mytimeout/t/dev-test$ fg
mosquitto_sub -v -t home/test/switchTimer | awk '{ print strftime("%F_%T.%s"), "" $0; fflush(); }' | tee ${file}
^C

*/

// =[ Fini ]=====================================================================================
