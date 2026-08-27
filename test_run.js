global.window = { innerWidth: 800, innerHeight: 600, addEventListener: () => {}, removeEventListener: () => {} };
global.window.AudioContext = class { createGain() { return { connect: () => {}, gain: { value: 1 } }; } createBufferSource() { return {}; } };
global.document = { getElementById: (id) => {
    if (id === 'gameCanvas') return { getContext: () => ({ setTransform:()=>{}, clearRect:()=>{}, translate:()=>{}, save:()=>{}, restore:()=>{}, fillText:()=>{}, measureText:()=>({width:10}), beginPath:()=>{}, fill:()=>{}, stroke:()=>{}, moveTo:()=>{}, lineTo:()=>{}, arc:()=>{} }), width: 800, height: 600 };
    return { style: {}, addEventListener: () => {}, innerHTML: '', appendChild: () => {}, querySelector: () => ({ addEventListener: () => {} }), classList: { add: () => {}, remove: () => {} } };
} };
global.requestAnimationFrame = () => {};
global.Image = class {};
global.fetch = async () => ({ arrayBuffer: async () => new ArrayBuffer(0) });
import('./js/main.js').then(m => console.log("Success!")).catch(e => console.error(e));
