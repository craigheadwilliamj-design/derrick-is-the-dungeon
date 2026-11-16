// Derrick's life (phase 5b): what he has been up to is a region modifier. Acute and positive events roll once per day; chronic conditions come with Reinfection (NG+).
// event = { id, name, kind:'acute|positive|chronic', regions:[region ids, 'bloodstream' = the vessels, '*' = everywhere], blurb, mapNote, summary:[player-facing effect lines],
//   effects:[effect engine entries, src 'event'], mods:{ vessel, dungeon, global }, primes?:[enemy ids that count as beaten for Memory],
//   chart:{ hr, sys, dia, rr, spo2, temp, glu, osm (deltas from the baseline vitals), why:{ vital: one plain line }, note? }, npcLines:{ npcId | 'any': [lines] } }
// mods.vessel applies on vessel trips when the event touches 'bloodstream' (or '*'); mods.dungeon applies in the event's own dungeons; mods.global always applies.
// Every number comes from DD.S.events / DD.S.chronic. Every line is intro-level A&P; the jokes are about Derrick, the facts are real.
(function () {
  const E = DD.S.events, K = DD.S.chronic, pc = x => Math.round(x * 100) + '%', loot = pc(E.lootMult - 1);
  const L = ' glucose from enemies, pickups and cells in the affected places.';
  const ev = [
    { id: 'nightOut', name: 'Big night out', kind: 'acute', regions: ['kidneys', 'bloodstream'],
      blurb: 'Derrick went out last night. Alcohol suppresses ADH (antidiuretic hormone), so his kidneys sent out extra water and he woke up dehydrated.',
      mapNote: 'Dehydrated: sluggish vessels, tougher kidneys.',
      summary: ['Arteries carry you along only every ' + E.nightOut.pushEvery + 'th step (sluggish flow).', 'Kidney pathogens are ' + E.nightOut.kidneyLevels + ' level higher.', '+' + loot + L],
      effects: [], mods: { vessel: { pushEvery: E.nightOut.pushEvery }, dungeon: { lvlAdd: E.nightOut.kidneyLevels } },
      chart: { hr: 20, sys: -6, dia: -4, osm: 14, why: { osm: 'Alcohol suppresses ADH, so he is losing water and his plasma osmolality is up.' } },
      npcLines: {
        podocyte: ['No ADH. None. Do you know how much filtrate I am dealing with?'],
        jg: ['Low blood volume means low pressure at my afferent arteriole, so I release renin. Derrick caused this one with a bar tab.'],
        any: ['Alcohol suppresses ADH, so Derrick lost water all night and is now blaming the lighting.'] } },
    { id: 'allNighter', name: 'All-nighter', kind: 'acute', regions: ['*'],
      blurb: 'Derrick stayed up all night. Sleep loss keeps cortisol and sympathetic activity high, and sustained high cortisol suppresses immune function.',
      mapNote: 'Cortisol up, defenses down.',
      summary: ['Defense −' + pc(1 - E.allNighter.defenseMult) + '.'],
      effects: [{ id: 'ev-allnighter', src: 'event', trigger: 'static', result: { type: 'stat', stat: 'defense', mult: E.allNighter.defenseMult } }], mods: {},
      chart: { hr: 14, sys: 8, dia: 6, why: { bp: 'Sleep loss keeps cortisol and sympathetic activity high, which pushes blood pressure up.' } },
      npcLines: {
        neuron: ['He has been awake for thirty hours and thinks cramming helps. Memory consolidation needs sleep.'],
        'helper-t': ['No sleep means high cortisol, and cortisol dampens us. I am coordinating a response with half a staff.'],
        any: ['An all-nighter keeps cortisol high, and cortisol suppresses immune function. Everyone is working short-handed.'] } },
    { id: 'noHandwash', name: 'Didn’t wash his hands', kind: 'acute', regions: ['lungs'],
      blurb: 'Derrick skipped hand-washing again. Influenza spreads by respiratory droplets and by touching a contaminated surface and then your face.',
      mapNote: 'Influenza season: the lungs are full of it.',
      summary: ['Lungs: about ' + pc(E.noHandwash.rosterChance) + ' of pathogens are influenza.', '+' + loot + L],
      effects: [], mods: { dungeon: { roster: 'influenza', rosterChance: E.noHandwash.rosterChance } },
      chart: { hr: 24, rr: 8, temp: 1.5, spo2: -2, why: { temp: 'Pyrogens released during infection reset the hypothalamic set point, so he runs a fever.', rr: 'Fever raises his metabolic rate, so he breathes faster.' } },
      npcLines: {
        ciliated: ['Influenza damages ciliated cells like me. Derrick touched his face with unwashed hands, and now I am sweeping against the tide.'],
        type2: ['When the flu injures the alveolar lining, I divide to repair it. I would rather not have been needed.'],
        any: ['Handwashing really does cut down the spread of influenza. Derrick has not been told.'] } },
    { id: 'sunburn', name: 'Sunburn', kind: 'acute', regions: ['skin'],
      blurb: 'Derrick fell asleep at the beach. UV radiation damaged the DNA of his epidermal cells, and the skin is inflamed.',
      mapNote: 'UV-damaged skin: twice the traps.',
      summary: ['Skin: ' + E.sunburn.trapMult + '× as many traps.', '+' + loot + L],
      effects: [], mods: { dungeon: { trapMult: E.sunburn.trapMult } },
      chart: { hr: 6, temp: 0.5 },
      npcLines: {
        melanocyte: ['UV is DNA damage. I make melanin, but ramping up takes days, and Derrick’s nap took hours.'],
        keratinocyte: ['Sunburned keratinocytes with too much DNA damage self-destruct on purpose. The peeling is us leaving in an orderly way.'],
        any: ['A tan is not protection. It is the skin responding to UV damage.'] } },
    { id: 'tenK', name: 'Untrained 10K', kind: 'acute', regions: ['quads'],
      blurb: 'Derrick ran a 10K on a dare with no training. The soreness that follows is mostly microscopic muscle damage and inflammation, not lactic acid, which clears within about an hour.',
      mapNote: 'Torn-up quads: more pathogens drawn to the damage.',
      summary: ['Quadriceps: ' + E.tenK.extraEnemies + ' extra pathogens on every floor.', '+' + loot + L],
      effects: [], mods: { dungeon: { extraEnemies: E.tenK.extraEnemies } },
      chart: { hr: 10, note: 'Delayed soreness is microtears and inflammation, not lactic acid.' },
      npcLines: {
        fiber: ['Two days later and he says it is lactic acid. Lactate clears within about an hour. This is microtears and inflammation.'],
        satellite: ['Microtears are my cue. I activate and fuse in to repair the fiber. Derrick calls it pain. I call it a work order.'],
        any: ['The soreness after a hard, unfamiliar workout is mostly microscopic muscle damage and inflammation, not lactic acid.'] } },
    { id: 'brokenLeg', name: 'Broken leg', kind: 'acute', regions: ['femur'],
      blurb: 'Derrick did a stunt for a video and broke his femur. At a fracture, macrophages clear the debris first, and then osteoblasts build new bone.',
      mapNote: 'Inflamed femur full of debris. Macrophages are on cleanup.',
      summary: ['Femur: Macrophage deals ×' + E.brokenLeg.damageMult + ' damage and heals ' + pc(E.brokenLeg.killHealPct) + ' extra HP per kill.', '+' + loot + L],
      effects: [{ id: 'ev-leg-dmg', src: 'event', trigger: 'static', cond: { region: 'femur', classId: 'macrophage' }, result: { type: 'damageMult', mult: E.brokenLeg.damageMult } },
        { id: 'ev-leg-heal', src: 'event', trigger: 'onKill', cond: { region: 'femur', classId: 'macrophage' }, result: { type: 'heal', pct: E.brokenLeg.killHealPct } }], mods: {},
      chart: { hr: 20, sys: 8, dia: 6, why: { bp: 'Pain triggers the sympathetic response, which raises heart rate and blood pressure.' } },
      npcLines: {
        osteocyte: ['Fourteen years in this lacuna, and he jumps off a roof for a video.'],
        osteoblast: ['A fracture heals in stages: a soft callus first, then I lay down woven bone, and remodeling follows for months.'],
        any: ['Derrick broke his femur. Macrophages clear the debris, then osteoblasts rebuild. Nobody asked how the jump went.'] } },
    { id: 'takeout', name: 'Takeout week', kind: 'acute', regions: ['gut'],
      blurb: 'Derrick has eaten takeout all week. Food in the stomach stimulates gastrin, which tells parietal cells to secrete more hydrochloric acid.',
      mapNote: 'More acid-splash traps in the gut.',
      summary: ['Gut: ' + E.takeout.trapMult + '× as many acid-splash traps.', '+' + loot + L],
      effects: [], mods: { dungeon: { trapMult: E.takeout.trapMult } },
      chart: { sys: 8, dia: 2, why: { bp: 'A high-sodium diet makes the body hold water, which raises blood volume and pressure.' } },
      npcLines: {
        parietal: ['Takeout week means gastrin, and gastrin means I secrete more HCl. He calls it heartburn.'],
        goblet: ['I make the mucus that protects the lining from all this acid and grease. Double shifts, no overtime.'],
        enterocyte: ['Fat-heavy food gets absorbed into the lacteals instead of the blood. I am just trying to keep up.'],
        any: ['A week of takeout is a week of salt, and salt makes him hold water and raises his blood pressure.'] } },
    { id: 'fluShot', name: 'Flu shot', kind: 'positive', regions: ['lungs'],
      blurb: 'Derrick finally got his flu shot. The vaccine primes B cells to form memory cells against influenza, so a real exposure gets a faster, stronger response.',
      mapNote: 'Vaccinated: bonus against influenza.',
      summary: ['×' + E.fluShot.mult + ' damage against influenza.', 'Influenza counts as a species you have already beaten, so B Cell Memory applies.', '+' + loot + L],
      effects: [{ id: 'ev-flu-shot', src: 'event', trigger: 'static', cond: { enemyId: 'influenza' }, result: { type: 'damageMult', mult: E.fluShot.mult } }], mods: {}, primes: ['influenza'],
      chart: { temp: 0.2 },
      npcLines: {
        plasma: ['He got the shot! Now my memory cousins have a head start on influenza.'],
        ciliated: ['The flu shot trained memory cells against influenza. Not the common cold, Derrick. Do not test me.'],
        any: ['The flu shot makes memory B and T cells for the influenza strains it covers. It does not protect against colds.'] } },
    { id: 'wellRested', name: 'Ate well, slept 8 hours', kind: 'positive', regions: ['*'],
      blurb: 'Derrick ate real food and slept a full eight hours. Stress hormones fall overnight, and the body gets its repair work done.',
      mapNote: 'Well rested: healing is better everywhere.',
      summary: ['Healing +' + pc(E.wellRested.healMult - 1) + ' everywhere.'],
      effects: [], mods: { global: { healMult: E.wellRested.healMult } },
      chart: { hr: -8, sys: -4, dia: -2 },
      npcLines: {
        mast: ['He ate a vegetable. Voluntarily. I had to sit down.'],
        'helper-t': ['A full night of sleep lets cortisol fall, and I can finally coordinate properly. Nobody warned me.'],
        any: ['Derrick slept eight hours and ate real food. We are all in shock.'] } },
    { id: 'hydrated', name: 'Stayed hydrated', kind: 'positive', regions: ['bloodstream', 'kidneys'],
      blurb: 'Derrick drank plenty of water. His blood volume and pressure stay steady, and ADH stays low, so the kidneys can excrete the extra water as dilute urine.',
      mapNote: 'Good blood volume: calmer vessels.',
      summary: ['Vessel ambushes are ' + pc(-E.hydrated.ambushDelta) + ' less likely on each vessel segment.', '+' + loot + L],
      effects: [], mods: { vessel: { ambushDelta: E.hydrated.ambushDelta } },
      chart: { hr: -4, osm: -4 },
      npcLines: {
        podocyte: ['Plenty of fluid in, so ADH is low and he will make dilute urine. Normal. Beautiful.'],
        jg: ['Blood volume is good, so I am barely releasing any renin. A quiet day.'],
        any: ['Derrick drank enough water. Good blood volume keeps the pressure steady, so the vessels are calmer.'] } },

    // Chronic conditions: from Reinfection 1 on, for the whole playthrough.
    { id: 'diabetes', name: 'Type 2 diabetes', kind: 'chronic', regions: ['kidneys', 'bloodstream'],
      blurb: 'Derrick’s cells respond poorly to insulin, so glucose stays high in his blood. When it exceeds what the kidney can reabsorb, glucose spills into the urine (glycosuria) and takes water with it.',
      mapNote: 'Glycosuria: glucose is lost in the kidneys.',
      summary: ['×' + K.diabetes.glucoseMult + ' glucose drops everywhere.', 'Lose ' + pc(K.diabetes.glycosuriaPct) + ' of carried glucose each time a route passes the renal vein or kidneys.', 'Healing ×' + K.diabetes.healMult + '.'],
      effects: [], mods: { global: { glucoseMult: K.diabetes.glucoseMult, healMult: K.diabetes.healMult } }, glycosuria: { pct: K.diabetes.glycosuriaPct, nodes: ['renalV', 'kidneys'] },
      chart: { glu: 52, osm: 6, why: { glu: 'His cells respond poorly to insulin, so glucose stays high. A fasting glucose of 126 mg/dL or more fits diabetes.' } },
      npcLines: {
        podocyte: ['Too much glucose in the filtrate. It exceeds what the tubule can reabsorb, so sugar spills into the urine and drags water with it.'],
        any: ['Type 2 diabetes: cells respond poorly to insulin, so glucose stays high in the blood.'] } },
    { id: 'hypertension', name: 'Hypertension', kind: 'chronic', regions: ['bloodstream', 'heart'],
      blurb: 'Derrick’s blood pressure stays too high. Constant pressure damages artery walls and contributes to plaque buildup.',
      mapNote: 'High pressure: more clots and plaque in the vessels.',
      summary: ['Vessels get ' + pc(K.hypertension.hazardMult - 1) + ' more clots and plaques.'],
      effects: [], mods: { vessel: { hazardMult: K.hypertension.hazardMult } },
      chart: { sys: 32, dia: 18, why: { bp: 'Chronically high pressure strains the artery walls and makes the left ventricle work against more resistance.' } },
      npcLines: {
        myocyte: ['Years of high blood pressure make the left ventricle work against more resistance, so my wall thickens. That is not the good kind of strong.'],
        any: ['Hypertension damages the lining of arteries and makes the heart pump against more resistance.'] } },
    { id: 'smoking', name: 'Smoking', kind: 'chronic', regions: ['lungs'],
      blurb: 'Derrick smokes. Smoke paralyzes and destroys cilia, so the mucociliary escalator stalls and the airways clear debris poorly.',
      mapNote: 'Cilia impaired: nastier lungs.',
      summary: ['Lung pathogens are ' + K.smoking.lungLevels + ' level higher.', 'Mucus Ward absorbs only ' + pc(K.smoking.wardAbsorb) + ' of the next hit, not all of it.'],
      effects: [], mods: { dungeon: { lvlAdd: K.smoking.lungLevels }, global: { wardAbsorb: K.smoking.wardAbsorb } },
      chart: { hr: 10, sys: 8, dia: 6, why: { bp: 'Nicotine stimulates the sympathetic nervous system, raising heart rate and blood pressure.' } },
      npcLines: {
        ciliated: ['Smoke stuns my cilia, so the mucus pools and he has to cough to do my job.'],
        type2: ['Smoking damages the whole lining. I keep repairing it, and he keeps lighting up.'],
        any: ['Smoking impairs the cilia that sweep mucus out of the airways, so debris stays in.'] } }
  ];
  DD.data.events = ev;
  DD.data.eventById = {};
  ev.forEach(e => { DD.data.eventById[e.id] = e; });
  DD.data.chronicIds = ev.filter(e => e.kind === 'chronic').map(e => e.id);
  // Normal ranges for Derrick's chart (low/high are inclusive bounds; bp is judged on both numbers).
  DD.data.vitals = [
    { id: 'hr', name: 'Heart rate', unit: 'bpm', lo: 60, hi: 100, normal: '60–100 bpm' },
    { id: 'bp', name: 'Blood pressure', unit: 'mmHg', normal: 'below 120/80 mmHg' },
    { id: 'rr', name: 'Respiratory rate', unit: '/min', lo: 12, hi: 20, normal: '12–20 breaths/min' },
    { id: 'spo2', name: 'Oxygen saturation (SpO₂)', unit: '%', lo: 95, hi: 100, normal: '95–100%' },
    { id: 'temp', name: 'Temperature', unit: '°C', lo: 36.5, hi: 37.5, normal: '36.5–37.5 °C (97.7–99.5 °F)' },
    { id: 'glu', name: 'Fasting blood glucose', unit: 'mg/dL', lo: 70, hi: 99, normal: '70–99 mg/dL (126 or more fits diabetes)' },
    { id: 'osm', name: 'Plasma osmolality (hydration)', unit: 'mOsm/kg', lo: 275, hi: 295, normal: '275–295 mOsm/kg' }
  ];
})();
