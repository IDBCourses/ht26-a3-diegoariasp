/*
 * IDB Programming: A3 — a musical instrument
 *
 * All of the code for your instrument goes in this file. It's split into sections:
 *   settings — the "fixed" parts of your program
 *   state    — the parts of your program that change over time
 *   sound    — the Tone.js instruments and effects
 *   update   — updates the state every 100ms, if necessary
 *   use      — uses the state to make sound and shapes every 100ms, if necessary
 *   controls — what happens when the player uses the pointer
 *   setup    — starts everything
 *
 * The pointer events change the state. update() and use() each run every
 * 100ms, in a loop:
 *   1. update: change the state, e.g. based on time or on the pointer's movement
 *   2. use:    make sound and move shapes, based on the state
 *
 * Shapes come from shape.js: createShape() makes one, and its methods
 * (setPosition, setSize, setColour ...) change it.
 *
 * Tone.js documentation: https://tonejs.github.io/docs/15.1.22/
 */


import { createShape } from "./shape.js";

//SETTINGS//
const ballFollow = 0.03;    // How fast the ball follows the pointer. 0 = no movement, 1 = instant movement.
const tailFollow = 0.6;     // How fast the tail follows each segment in front of it. 0 = no movement, 1 = instant movement.
const tailLength = 300;     /* Number of tail segments that follow the ball. DO NOT GO OVER 2000, or my computer will literally explode.
                               jk, but it will get really slow and laggy. More segments = more balls to render and update. */

const ballSize = 40;                  // Default size of the ball in pixels.
const ballGrowth = ballSize * 1.3;    // How much the ball grows when the pointer is far away.
const maxGap = 400;                   // Max distance (between the pointer and the ball)

//SOUND SETTINGS//
const minPitch = 110;     // Minimum pitch of the sound in Hz.
const maxPitch = 997;     // Maximum pitch of the sound in Hz.
const minCutoff = 150;    // Minimum filter frequency of the lowpass filter in Hz.
const maxCutoff = 5000;   // Maximum filter frequency of the lowpass filter in Hz.


const pointer = {         // Initializes the pointer variable, and sets the ball position to the middle of the window in the start of the program.
  x: window.innerWidth / 2,
  y: window.innerHeight / 2
};

//BALL AND TAIL//
const bodies = [];           // Array that contains the ball and tail segments.
let gap = 0;                 // Distance between the pointer and the ball.
let isAudioReady = false;    // A boolean checking if the audio is ready to play. It is set to 'true' after the first click on the window.

//SOUND//
const filter = new Tone.Filter(150, "lowpass").toDestination();         // Lowpass filter that will be applied to the sound.
const drone = new Tone.Oscillator(110, "triangle").connect(filter);     // Oscillator that generates the sound.

drone.volume.value = -100;     // Sets the initial oscillator volume to -100 dB to avoid a loud sound when the program starts.

// Function to move the ball and tail
function updateSegments() {

  // Loop through all the segments of the tail to update their positions.
  for (let i = 0; i < bodies.length; i++) {
    let target;
    if (i === 0) {        // If it is the first segment, the target is the pointer.
      target = pointer;
    } else {              // Otherwise, the target is the segment in front of it.
      target = bodies[i - 1];
    }

    
    // Determines the follow speed based on the segment's position.
    let follow;
    if (i === 0) {        // First segment uses ballFollow speed.
      follow = ballFollow;
    } else {              // Other segments use tailFollow speed.
      follow = tailFollow;
    }

    bodies[i].x += (target.x - bodies[i].x) * follow;   // Lerp (linear interpolation) the segment's position towards the target's position based on the follow speed.
    bodies[i].y += (target.y - bodies[i].y) * follow;   // Formula: currentPosition + (targetPosition - currentPosition) * followSpeed
  }

  // Finds the x and y distances between the mouse and the ball
  let distanceX = pointer.x - bodies[0].x;
  let distanceY = pointer.y - bodies[0].y;


  gap = Math.sqrt(distanceX * distanceX  +  distanceY * distanceY);   // Calculates the distance between the pointer and the ball using the Pythagorean theorem.
                                                                      // Formula: distance = sqrt(x^2 + y^2)
                                                                   
  //console.log("[MOVEMENT] Distance from pointer:", gap.toFixed(2));
  }

// Function to draw the ball and tail
function drawSegments() {
  let strength = gap / maxGap;    // Strength is used to determine the ball's growth, color, and sound.


  if (strength > 1) {   // Clamps the strength value between 0 and 1 when the mouse goes too far away.
    strength = 1;
  }

  let hue = 210 - strength * 210;  // As strength increases, the hue value decreases, changing colors from blue to red.

  // Loop through all the segments of the tail to update their size, color, and position.
  for (let i = 0; i < bodies.length; i++) {
    let fade = 1 - i / (tailLength + 1);                    // Fade calculates how much each segment should fade based on its position in the tail.
    let size = (ballSize + strength * ballGrowth) * fade;   // Size of the segment is determined by the ball's size, growth, and fade.
    let lightness = 55 * fade;                              // Lightness of the segment is determined by the fade value.

    bodies[i].shape.setSize(size);                          // Sets the size of the segment.
    bodies[i].shape.setColour(hue, 80, lightness, fade);    // Sets the color of the segment using HSL and fade.

    bodies[i].shape.setPositionPixels(                      // Sets the position of the segment based on its x and y coordinates, divided by half its size to center it.
      bodies[i].x - size / 2,
      bodies[i].y - size / 2
    );
  }

  // Change the sound
  if (isAudioReady) {
    changeSound(strength);
  }
}

// Change pitch, volume and brightness
function changeSound(strength) {

  let height = 1 - bodies[0].y / window.innerHeight;   // Higher ball = higher pitch

  if (height < 0) {                                    // Height cannot go below 0.
    height = 0;
  }
  if (height > 1) {                                    // Height cannot go above 1.
    height = 1;
  }

  let pitch = minPitch + height * (maxPitch - minPitch);          // Calculate pitch based on height, minPitch, and maxPitch.
  let cutoff = minCutoff + strength * (maxCutoff - minCutoff);    // Calculate cutoff frequency based on strength, minCutoff, and maxCutoff.
  let volume = -60 + strength * 52;                               // Calculate volume based on strength.

  drone.frequency.rampTo(pitch, 0.05);                            // Ramp the oscillator frequency to the new pitch over 0.05 seconds.
  filter.frequency.rampTo(cutoff, 0.05);                          // Ramp the filter frequency to the new cutoff over 0.05 seconds.
  drone.volume.rampTo(volume, 0.05);                              // Ramp the oscillator volume to the new volume over 0.05 seconds.
}

// Repeat every frame
function loop() {
  updateSegments();               // This is called every frame to update the ball and tail positions...
  drawSegments();                         // ... draw them...
  requestAnimationFrame(loop);    // ... and request the next frame, repeat.
}

// Remember the mouse position
function pointerMove(event) {     // Called every time the mouse moves, and updates the pointer position.
  pointer.x = event.clientX;
  pointer.y = event.clientY;

  /*
  console.log("[POINTER] Position:", {
    x: pointer.x,
    y: pointer.y
  });
  */
}

// Start sound after a click on the window.
async function pointerDown(event) {
  pointerMove(event);

  if (!isAudioReady) {
    console.log("[AUDIO] Starting audio...");
    isAudioReady = true;
    await Tone.start();
    drone.start();
    console.log("[AUDIO] Audio successfully started!");
  }else{
    console.log("[AUDIO] Audio is already started.");
  }
}

// Create the ball and tail segments, and set up event listeners for mouse movement, and the start click.
function setup() {
  for (let i = 0; i <= tailLength; i++) {
    const shape = createShape();
    shape.setRoundedness(1);
    shape.element.style.zIndex = tailLength - i; // Sets the z-index of the segment to make sure the ball is always on top of the tail segments.

    bodies.push({                                // Adds the segment to the bodies array, with its shape and initial position.
      shape: shape,
      x: pointer.x,
      y: pointer.y
    });
  }
  console.log("[SETUP] Created", bodies.length, "bodies.");
  console.log("[SETUP] Main ball and tail initialized.");

  window.addEventListener("pointermove", pointerMove);
  window.addEventListener("pointerdown", pointerDown);

  console.log("[SETUP] Event listeners registered.");
  console.log("[SETUP] Starting animation loop...");

  loop();
}

setup(); // Fire it up!