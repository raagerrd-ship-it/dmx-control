/**
 * Den LANGSAMMA analysatortraden (se split.ts). Startas av createAnalyser() nar
 * DMX_ANALYSER_SPLIT=worker: samma Analyser-klass, roll 'slow', matad ur SAB-ringen.
 * Loopen blockerar i Atomics.wait tills den snabba traden skrivit ett record (10 ms-takt),
 * dranerar allt som ligger, publicerar tillstandet och somnar igen. Ingen event-loop-korning
 * behovs; workern har egen V8-heap, sa dess GC ror aldrig ljusvagen - vilket ar hela poangen
 * (motorn matte 15,6 % av hoppen over budget, toppar 235 ms).
 *
 * FALLA 3 - MEDDELANDEN. Loopen ar synkron och kor ALDRIG event-loopen, sa `parentPort.on('message')`
 * fyrar aldrig; i lotus var 'stop' darfor dott (workern levde 2 s efter stop). Porten lases i stallet
 * synkront med receiveMessageOnPort() varje varv (100/s, mikrosekunder).
 *
 * OMSTART: dor traden (kastat fel, OOM) startar createAnalyser en ny med SAMMA buffertar och
 * resumeSeq = senast lasta record, sa den fortsatter i sekvensen (backloggen klipps till
 * RING_N-RING_MARGIN i drainRecords). `crash` finns bara bakom DMX_SPLIT_TEST_CRASH=1.
 */
import { workerData, parentPort, receiveMessageOnPort } from 'node:worker_threads';
import { Analyser } from './analyser.js';
import { C_WRITE, C_WAITING, seqLow } from './split.js';
const { cfg, buffers, resumeSeq } = workerData;
const ctrl = new Int32Array(buffers.ctrl);
const an = new Analyser(cfg, { role: 'slow', split: buffers, resumeSeq });
const TEST_CRASH = process.env.DMX_SPLIT_TEST_CRASH === '1';
let stop = false;
function pollMessages() {
    if (!parentPort)
        return;
    for (;;) {
        const m = receiveMessageOnPort(parentPort);
        if (!m)
            return;
        const msg = m.message;
        if (msg?.type === 'stop')
            stop = true;
        else if (msg?.type === 'crash' && TEST_CRASH)
            throw new Error('DMX_SPLIT_TEST_CRASH: avsiktlig worker-krasch (stresstest)');
    }
}
// Sov aldrig langre an 200 ms sa ett 'stop' hinner fram; i drift vacks vi var 10 ms av notify.
// FALLA 4 - DEKKER-VAKNING: C_WAITING satts FORE wait-jamforelsen (Dekker mot skrivarens store->load):
// antingen ser skrivaren flaggan och notify:ar, eller sa ser wait ett nytt C_WRITE och returnerar
// direkt. Skrivaren slipper notify:a 100/s i onodan, och ingen vackning kan ga forlorad i glappet.
while (!stop) {
    const w = Atomics.load(ctrl, C_WRITE);
    if (seqLow(an.slowReadSeq()) === w) {
        Atomics.store(ctrl, C_WAITING, 1);
        Atomics.wait(ctrl, C_WRITE, w, 200);
        Atomics.store(ctrl, C_WAITING, 0);
        pollMessages();
        continue;
    }
    an.drainRecords();
    pollMessages();
}
