const synth = new Tone.AMSynth().toMaster();
console.log(synth);
var array = [], savedSong1 = [], savedSong2 = [], savedSong3 = [], savedSong4 = [], savedSong5 = [],
input, output, stopRecording;

var wmaw = new WebMIDIAPIWrapper( false );

WebMidi.enable(function () {

    console.log(WebMidi.inputs);
    console.log(WebMidi.outputs);

    input = WebMidi.getInputById("27857959");
    output = WebMidi.getOutputById("-610582400");

    console.log(input);
    console.log(output);

    document.getElementById('show-log').addEventListener('click', showLog);
    document.getElementById('playback').addEventListener('click', playback);
    document.getElementById('record').addEventListener('click', record);
    document.getElementById('octave-down').addEventListener('click', function(){
    changeTune(-12);
    });
    document.getElementById('octave-up').addEventListener('click', function(){
    changeTune(12);
    });
    document.getElementById('transpose-down').addEventListener('click', function(){
        changeTune(-1);
        });
        document.getElementById('transpose-up').addEventListener('click', function(){
        changeTune(1);
        });

    input.addListener('songselect', 'all',
        function(e){
            console.log(e.data);
            console.log(e.timestamp);
            console.log(e.type);
            console.log(e.song);
        });

    input.addListener('pitchbend', 3,
        function (e) {
          console.log("Received 'pitchbend' message.", e);
        }
    );

});

function showLog(){
    for (var i = 0; i < array.length; i ++){
        var event = array[i];
        if(event.type == "noteon"){
            console.log(event.note.name + event.note.octave + ", " + event.type + " @ velocity " + event.velocity + ", time: " + event.timestamp);
        } else if (event.type == "noteoff"){
            console.log(event.note.name + event.note.octave + ", " + event.type + ", time: " + event.timestamp);
            console.log("This note finished at " + event.timestamp);
        } else if (event.controller.name == "holdpedal"){
            if(event.value < 64){
                console.log("Sustain pedal depressed");
            } else {
                console.log("Sustain pedal pressed");
            }
        } else {
            console.log("Unrecognised event logged");
        }
    }
}

function record(){
    stopRecording = false;
    array = [];
    input.addListener('noteon', "all",
            function (e) {
                if(!stopRecording){
                    console.log(e.note.name + e.note.octave + " pressed at " + e.velocity);
                    synth.triggerAttack(e.note.number);
                    logMidiMessage(e);
                    array.push(e);
                    console.log("Array now contains " + array.length + " events.");
                }
            }
          );

    input.addListener('noteoff', "all",
            function (e) {
                if(!stopRecording){
                    synth.triggerRelease();
                    array.push(e);
                    console.log("Note Off detected. Array now contains " + array.length + " events");
                }
            })

    input.addListener('controlchange', "all",
                function (e) {
                    console.log("Received 'controlchange' message.", e);
                        array.push(e);
                }
            );

}

function changeTune(amountOfKeys){
    for (var i = 0; i < array.length; i++){
        if(array[i].type == "noteon" || array[i].type == "noteoff"){
            var note = array[i].note.number;
            if(note + amountOfKeys > 128 || note + amountOfKeys < 0){
                return;
            }
        }
    }
    console.log("Changing tune by " + amountOfKeys + " keys");
    var newArray = [];
    for (var i = 0; i < array.length; i++){
        if(array[i].type == "noteon" || array[i].type == "noteoff"){
                console.log(array[i].note.number + " is original note number...");
                array[i].note.number += amountOfKeys;
                console.log(array[i].note.number + " is new note number.");
        }
    }
}

function octaveUp(){
    console.log("Moving octave down 1 step");
    for (var i = 0; i < array.length; i++){
        var currentOctave = array[i].note.octave;
        array[i].note.octave = currentOctave + 1;
    }
}

function octaveDown(){
    console.log("Moving octave up 1 step");
    for (var i = 0; i < array.length; i++){
        var currentOctave = array[i].note.octave;
        array[i].note.octave = currentOctave - 1;
    }
}



function playback(){
    console.log("Playback starting...");
    var firstNoteTime = array[0].timestamp;
    for (var i = 0; i < array.length; i ++){
            var event = array[i];
            if(event.type == "noteon"){
                console.log("Note: " + event.note.number + ", velocity: " + event.velocity + ", timestamp: " + (event.timestamp - firstNoteTime));
                output.playNote(event.note.number, event.channel, {velocity: event.velocity, time: "+" + (event.timestamp - firstNoteTime)});
            } else if(event.type == "noteoff"){
                console.log("Note: " + event.note.number + ", timestamp: " + (event.timestamp - firstNoteTime));
                output.stopNote(event.note.number, event.channel, {time: "+" + (event.timestamp - firstNoteTime)});
            } else if(event.type = "controlchange"){
                if(event.value < 64){
                    output.sendControlChange("holdpedal", 0, event.channel, {time: "+" + (event.timestamp - firstNoteTime)});
                } else {
                    output.sendControlChange("holdpedal", 127, event.channel, {time: "+" + (event.timestamp - firstNoteTime)});
                }
            } else {
                console.log("Unrecognised event");
            }
        }
}

function logMidiMessage(message) {
            if ((typeof event === 'undefined') || (event === null)) {
                console.warn("logMidiMessage: null or undefined message received");
                return;
            }
            console.log(message);
        }


function onMIDISuccess(midiAccess) {
    for (var input of midiAccess.inputs.values()){
        input.onmidimessage = getMIDIMessage;
        console.log(input.onmidimessage);
    }
}

function getMIDIMessage(message) {
    var command = message.data[0];
    var note = message.data[1];
    var velocity = (message.data.length > 2) ? message.data[2] : 0; // a velocity value might not be included with a noteOff command

    switch (command) {
        case 144: // noteOn
            if (velocity > 0) {
                noteOn(note, velocity);
            } else {
                noteOff(note);
            }
            break;
        case 128: // noteOff
            noteOff(note);
            break;
        // we could easily expand this switch statement to cover other types of commands such as controllers or sysex
    }
}

function noteOn(note, velocity){
    console.log("Note pressed: " + note + " at " + velocity + " velocity");

}

function noteOff(note){
    console.log("Note stopped: " + note);

}

function trickOfTheLight(i){
    trickLyrics(i);
    output.playNote(["B2", "D#3", "F#3", "B3", "D#4"], 1, {duration: 2000});
    sleep(1000);
    output.playNote(["B2", "D#3"], 1, {duration: 1000});
    sleep(1000);
    output.playNote(["A#2", "F#3", "A#3", "F#4"], 1, {duration: 1000});
    sleep(1000);
    output.playNote(["A#2", "D3", "F3", "A#3", "D4", "F4"], 1, {duration: 1000});
    sleep(1000);
    output.playNote(["A#2", "D#3", "A#3", "D#4"], 1, {duration: 1000});
    sleep(1000);
    output.playNote(["A#2", "D#3"], 1, {duration: 1000});
    sleep(1000);
    output.playNote(["A#2", "C#3", "A#3", "C#4"], 1, {duration: 1000});
    sleep(1000);
    output.playNote(["A#2", "C#3"], 1, {duration: 1000});
    sleep(1000);
    if(i == 2){
        trickMelody();
    }
}

function trickLyrics(i){
    switch(i){
        case 3:
            console.log("My heart is spilling over");
            setTimeout(lyrics(7), 2000);
            break;
        case 4:
            console.log("I can't see what's around me");
            setTimeout(lyrics(8), 2000);
            break;
        case 5:
            console.log("My faith is in the balance");
            setTimeout(lyrics(9), 2000);
            break;
        case 6:
            console.log("So I return to silence...");
            break;
        case 7:
            console.log("Crashing on the ground");
            break;
        case 8:
            console.log("But soon I'll come round");
            break;
        case 9:
            console.log("Of a million tiny words");
            break;
        default:
            console.log();
            break;
    }
}

function trickMelody(){
    output.playNote("C#5", 1).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("G#4", 1, {time: "+650"}).stopNote("G#4", 1, {time: 250, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+850"}).stopNote("G#4", 1, {time: 600, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+1500"}).stopNote("G#4", 1, {time: 300, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+1700"}).stopNote("G#4", 1, {time: 500, velocity: 0.75});
    output.playNote("F#4", 1, {time: "+2300"}).stopNote("F#4", 1, {time: 400, velocity: 0.7});

    output.playNote("D#4", 1, {time: "+3300"}).stopNote("D#4", 1, {time: 150, velocity: 0.55});
    output.playNote("D#4", 1, {time: "+3400"}).stopNote("D#4", 1, {time: 250, velocity: 0.55});
    output.playNote("D#5", 1, {time: "+3700"}).stopNote("D#5", 1, {time: 300, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+4500"}).stopNote("G#4", 1, {time: 200, velocity: 0.5});
    output.playNote("G#4", 1, {time: "+5000"}).stopNote("G#4", 1, {time: 300, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+5300"}).stopNote("G#4", 1, {time: 200, velocity: 0.6});
    output.playNote("F#4", 1, {time: "+6000"}).stopNote("F#4", 1, {time: 400, velocity: 0.75});

    output.playNote("C#5", 1, {time: "+7800"}).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("C#5", 1, {time: "+8100"}).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("G#4", 1, {time: "+8650"}).stopNote("G#4", 1, {time: 250, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+8850"}).stopNote("G#4", 1, {time: 600, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+9500"}).stopNote("G#4", 1, {time: 300, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+9700"}).stopNote("G#4", 1, {time: 500, velocity: 0.75});
    output.playNote("F#4", 1, {time: "+10300"}).stopNote("F#4", 1, {time: 400, velocity: 0.7});

    output.playNote("D#4", 1, {time: "+11000"}).stopNote("D#4", 1, {time: 250, velocity: 0.65});
    output.playNote("D#5", 1, {time: "+11700"}).stopNote("D#5", 1, {time: 300, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+12500"}).stopNote("G#4", 1, {time: 200, velocity: 0.5});
    output.playNote("G#4", 1, {time: "+13000"}).stopNote("G#4", 1, {time: 300, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+13300"}).stopNote("G#4", 1, {time: 200, velocity: 0.6});
    output.playNote("F#4", 1, {time: "+14000"}).stopNote("F#4", 1, {time: 400, velocity: 0.75});

    output.playNote("C#5", 1, {time: "+15000"}).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("C#5", 1, {time: "+15500"}).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("G#4", 1, {time: "+16650"}).stopNote("G#4", 1, {time: 250, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+16850"}).stopNote("G#4", 1, {time: 600, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+17500"}).stopNote("G#4", 1, {time: 300, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+17700"}).stopNote("G#4", 1, {time: 500, velocity: 0.75});
    output.playNote("F#4", 1, {time: "+18300"}).stopNote("F#4", 1, {time: 400, velocity: 0.7});

    output.playNote("D#4", 1, {time: "+18800"}).stopNote("D#4", 1, {time: 150, velocity: 0.55});
    output.playNote("D#4", 1, {time: "+19400"}).stopNote("D#4", 1, {time: 250, velocity: 0.55});
    output.playNote("D#5", 1, {time: "+19700"}).stopNote("D#5", 1, {time: 300, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+20500"}).stopNote("G#4", 1, {time: 200, velocity: 0.5});
    output.playNote("G#4", 1, {time: "+21000"}).stopNote("G#4", 1, {time: 300, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+21300"}).stopNote("G#4", 1, {time: 200, velocity: 0.6});
    output.playNote("F#4", 1, {time: "+22000"}).stopNote("F#4", 1, {time: 400, velocity: 0.75});

    output.playNote("C#5", 1, {time: "+23500"}).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("C#5", 1, {time: "+24200"}).stopNote("C#5", 1, {time: 400, velocity: 0.8});
    output.playNote("G#4", 1, {time: "+24650"}).stopNote("G#4", 1, {time: 250, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+24850"}).stopNote("G#4", 1, {time: 600, velocity: 0.75});
    output.playNote("G#4", 1, {time: "+25500"}).stopNote("G#4", 1, {time: 300, velocity: 0.55});
    output.playNote("G#4", 1, {time: "+25700"}).stopNote("G#4", 1, {time: 500, velocity: 0.75});
    output.playNote("F#4", 1, {time: "+26300"}).stopNote("F#4", 1, {time: 400, velocity: 0.7});


}

function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}

