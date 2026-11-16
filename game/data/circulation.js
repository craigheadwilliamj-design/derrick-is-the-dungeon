// The circulation as a directed graph (phase 3a). Content is data: nodes, edges, lymph drainage, town blurbs.
// Left-sided branches wherever a side is needed. Every note is intro-level A&P.
// kind: vessel (flow artery|vein) | chamber | valve | capillary | place | lymph.  Place sub: dungeon | thymus | town.
DD.data.circ = (function () {
  const nodes = {}, out = {};
  const add = (id, name, kind, o) => { nodes[id] = Object.assign({ id, name, kind }, o); out[id] = out[id] || []; };
  const A = (id, name, note, o) => add(id, name, 'vessel', Object.assign({ flow: 'artery', note }, o));
  const V = (id, name, note, o) => add(id, name, 'vessel', Object.assign({ flow: 'vein', note }, o));
  const CH = (id, name, note) => add(id, name, 'chamber', { note });
  const VL = (id, name, note) => add(id, name, 'valve', { note });
  const LY = (id, name, note, o) => add(id, name, 'lymph', Object.assign({ note }, o));
  const edge = (a, b, flag) => { (out[a] = out[a] || []).push(flag ? { to: b, flag } : { to: b }); };
  const chain = (...ids) => { for (let i = 0; i < ids.length - 1; i++) edge(ids[i], ids[i + 1]); };

  // ---- heart and the two circuits ----
  CH('ra', 'Right atrium', 'Receives deoxygenated blood from the superior and inferior venae cavae and the coronary sinus.');
  VL('tricuspid', 'Tricuspid valve', 'The right atrioventricular valve, with three cusps. It stops blood flowing back into the right atrium.');
  CH('rv', 'Right ventricle', 'Pumps deoxygenated blood toward the lungs.');
  VL('pulmValve', 'Pulmonary valve', 'A semilunar valve between the right ventricle and the pulmonary trunk.');
  A('pulmTrunk', 'Pulmonary trunk', 'Leaves the right ventricle and splits into the left and right pulmonary arteries.', { lenMul: 0.6 });
  A('pulmArt', 'Pulmonary arteries', 'They carry deoxygenated blood to the lungs. They are arteries because they carry blood away from the heart.', { lenMul: 0.8 });
  add('pulmCap', 'Pulmonary capillaries', 'capillary', { note: 'Gas exchange happens here: blood picks up oxygen and gives off carbon dioxide.', trap: 'Alveolar squeeze' });
  V('pulmVeins', 'Pulmonary veins', 'They carry oxygenated blood from the lungs to the left atrium.', { lenMul: 0.7 });
  CH('la', 'Left atrium', 'Receives oxygenated blood from the pulmonary veins.');
  VL('mitral', 'Mitral valve', 'The left atrioventricular valve, also called the bicuspid valve.');
  CH('lv', 'Left ventricle', 'The thickest-walled chamber. It pumps oxygenated blood into the aorta.');
  VL('aorticValve', 'Aortic valve', 'A semilunar valve between the left ventricle and the aorta.');
  A('ascAorta', 'Ascending aorta', 'The first part of the aorta. The coronary arteries branch off just above the aortic valve.', { lenMul: 0.8, trap: 'Aortic turbulence' });
  chain('ra', 'tricuspid', 'rv', 'pulmValve', 'pulmTrunk', 'pulmArt', 'pulmCap', 'pulmVeins', 'la', 'mitral', 'lv', 'aorticValve', 'ascAorta');

  // ---- heart muscle (coronary circulation) ----
  A('coronaryA', 'Coronary arteries', 'They supply the heart muscle itself.', { lenMul: 0.6 });
  V('cardiacV', 'Cardiac veins', 'They collect blood from the heart wall.', { lenMul: 0.6 });
  V('coronarySinus', 'Coronary sinus', 'A large vein on the back of the heart that empties into the right atrium.', { lenMul: 0.5 });
  chain('ascAorta', 'coronaryA', 'heart', 'cardiacV', 'coronarySinus', 'ra');

  // ---- head and neck ----
  A('arch', 'Aortic arch', 'Curves over the heart and gives off the arteries to the head and arms.', { lenMul: 0.8, trap: 'Aortic turbulence' });
  A('lCarotid', 'Left common carotid artery', 'Runs up the neck and splits into the internal and external carotid arteries.', { lenMul: 0.9 });
  A('intCarotid', 'Internal carotid artery', 'Supplies the brain and the eye.', { lenMul: 0.9 });
  A('extCarotid', 'External carotid artery', 'Supplies the face, scalp and neck, including the thyroid.', { lenMul: 0.6 });
  A('supThyroidA', 'Superior thyroid artery', 'The first branch of the external carotid. It supplies the thyroid gland.', { lenMul: 0.5 });
  A('ophthalmicA', 'Ophthalmic artery', 'A branch of the internal carotid artery that supplies the eye.', { lenMul: 0.5 });
  V('cerebralV', 'Cerebral veins', 'They drain the brain into the dural venous sinuses.', { lenMul: 0.7 });
  V('dural', 'Dural venous sinuses', 'Channels between layers of the dura mater that collect blood from the brain and drain into the internal jugular veins.', { lenMul: 0.9, trap: 'Sinus eddy' });
  V('ophthalmicV', 'Ophthalmic veins', 'They drain the eye and orbit into the cavernous sinus.', { lenMul: 0.5 });
  V('cavSinus', 'Cavernous sinus', 'Receives the ophthalmic veins and drains toward the internal jugular vein through the petrosal sinuses.', { lenMul: 0.6 });
  V('thyroidV', 'Superior and middle thyroid veins', 'They drain the thyroid into the internal jugular vein.', { lenMul: 0.5 });
  V('ijv', 'Internal jugular vein', 'The main vein draining the brain and much of the head and neck.', { lenMul: 0.9 });
  V('lAngle', 'Left venous angle', 'Where the left internal jugular and left subclavian veins meet. The thoracic duct empties here.', { lenMul: 0.4 });
  V('lBrach', 'Left brachiocephalic vein', 'Formed by the left internal jugular and subclavian veins. It crosses to join the right brachiocephalic vein.', { lenMul: 0.7 });
  V('rAngle', 'Right venous angle', 'Where the right internal jugular and right subclavian veins meet. The right lymphatic duct empties here.', { lenMul: 0.4 });
  V('rBrach', 'Right brachiocephalic vein', 'Joins the left brachiocephalic vein to form the superior vena cava.', { lenMul: 0.5 });
  V('svc', 'Superior vena cava', 'Returns blood from the head, neck, arms and chest wall to the right atrium.', { lenMul: 0.9 });
  chain('ascAorta', 'arch', 'lCarotid', 'intCarotid', 'brain', 'cerebralV', 'dural', 'ijv', 'lAngle', 'lBrach', 'svc', 'ra');
  chain('intCarotid', 'ophthalmicA', 'eyesears', 'ophthalmicV', 'cavSinus', 'dural');
  chain('lCarotid', 'extCarotid', 'supThyroidA', 'glands', 'thyroidV', 'ijv');

  // ---- arm (skin) and thymus, both off the left subclavian artery ----
  A('lSubclavian', 'Left subclavian artery', 'Supplies the left arm and gives off the internal thoracic artery.', { lenMul: 0.8 });
  A('axillaryA', 'Axillary artery', 'The continuation of the subclavian artery through the armpit.', { lenMul: 0.7 });
  A('brachialA', 'Brachial artery', 'The main artery of the upper arm.', { lenMul: 0.8 });
  V('armVeins', 'Basilic and cephalic veins', 'The main superficial veins of the arm.', { lenMul: 0.8 });
  V('axillaryV', 'Axillary vein', 'Drains the arm. It becomes the subclavian vein at the first rib.', { lenMul: 0.7 });
  V('subclavianV', 'Left subclavian vein', 'Joins the internal jugular vein to form the brachiocephalic vein.', { lenMul: 0.7 });
  A('intThoracicA', 'Internal thoracic artery', 'A branch of the subclavian artery that supplies the chest wall and the thymus.', { lenMul: 0.6 });
  V('thymicV', 'Thymic veins', 'They drain the thymus, mostly into the left brachiocephalic vein.', { lenMul: 0.5 });
  chain('arch', 'lSubclavian', 'axillaryA', 'brachialA', 'skin', 'armVeins', 'axillaryV', 'subclavianV', 'lAngle');
  chain('lSubclavian', 'intThoracicA', 'thymus', 'thymicV', 'lBrach');

  // ---- abdomen, pelvis, legs ----
  A('thoracicAorta', 'Thoracic aorta', 'The part of the aorta in the chest. It continues below the diaphragm as the abdominal aorta.', { lenMul: 1.2, trap: 'Aortic turbulence' });
  A('abdAorta', 'Abdominal aorta', 'Gives off the celiac trunk and the mesenteric, renal and gonadal arteries, then splits into the common iliac arteries.', { lenMul: 1.2, trap: 'Aortic turbulence' });
  chain('arch', 'thoracicAorta', 'abdAorta');
  A('celiac', 'Celiac trunk', 'The first major branch of the abdominal aorta. It supplies the stomach, liver and spleen.', { lenMul: 0.5 });
  A('splenicA', 'Splenic artery', 'The largest branch of the celiac trunk. It supplies the spleen.', { lenMul: 0.7 });
  V('splenicV', 'Splenic vein', 'Drains the spleen and joins the superior mesenteric vein to form the hepatic portal vein.', { lenMul: 0.7 });
  A('sma', 'Superior mesenteric artery', 'Supplies the small intestine and the first part of the large intestine.', { lenMul: 0.8 });
  V('smv', 'Superior mesenteric vein', 'Drains the intestines and joins the splenic vein to form the hepatic portal vein.', { lenMul: 0.8 });
  V('portalV', 'Hepatic portal vein', 'Carries blood from the gut and spleen to the liver before it returns to the heart.', { lenMul: 0.6 });
  add('liver', 'Liver sinusoids', 'capillary', { note: 'Leaky, capillary-like channels where the liver processes the blood arriving from the portal vein.', trap: 'Sinusoid snag' });
  V('hepaticV', 'Hepatic veins', 'They drain the liver into the inferior vena cava.', { lenMul: 0.5 });
  V('ivc', 'Inferior vena cava', 'Returns blood from the body below the diaphragm to the right atrium.', { lenMul: 1.3 });
  chain('abdAorta', 'celiac', 'splenicA', 'spleen', 'splenicV', 'portalV', 'liver', 'hepaticV', 'ivc', 'ra');
  chain('abdAorta', 'sma', 'gut', 'smv', 'portalV');
  A('renalA', 'Left renal artery', 'Branches directly from the abdominal aorta and supplies the kidney.', { lenMul: 0.6 });
  V('renalV', 'Left renal vein', 'Drains the left kidney and also receives the left gonadal vein before reaching the inferior vena cava.', { lenMul: 0.7 });
  A('gonadalA', 'Gonadal artery', 'Arises from the abdominal aorta and supplies the testis or ovary.', { lenMul: 0.8 });
  V('gonadalV', 'Left gonadal vein', 'Drains into the left renal vein. The right gonadal vein drains straight into the inferior vena cava.', { lenMul: 0.8 });
  chain('abdAorta', 'renalA', 'kidneys', 'renalV', 'ivc');
  chain('abdAorta', 'gonadalA', 'gonads', 'gonadalV', 'renalV');
  A('commonIliacA', 'Common iliac artery', 'The abdominal aorta splits into the right and left common iliac arteries.', { lenMul: 0.7 });
  A('intIliacA', 'Internal iliac artery', 'Supplies the pelvic wall and organs and the gluteal region.', { lenMul: 0.6 });
  V('intIliacV', 'Internal iliac vein', 'Drains the pelvis and joins the external iliac vein.', { lenMul: 0.6 });
  V('commonIliacV', 'Common iliac vein', 'Formed by the internal and external iliac veins. The two common iliac veins join to form the inferior vena cava.', { lenMul: 0.7 });
  A('extIliacA', 'External iliac artery', 'Runs toward the groin and becomes the femoral artery at the inguinal ligament.', { lenMul: 0.7 });
  A('femoralA', 'Femoral artery', 'The main artery of the thigh.', { lenMul: 0.9 });
  A('deepFemA', 'Deep femoral artery', 'A large branch of the femoral artery that supplies the femur and the thigh muscles.', { lenMul: 0.7 });
  V('femoralV', 'Femoral vein', 'Drains the thigh and becomes the external iliac vein at the inguinal ligament.', { lenMul: 0.9 });
  V('extIliacV', 'External iliac vein', 'Continues from the femoral vein and joins the internal iliac vein.', { lenMul: 0.7 });
  chain('abdAorta', 'commonIliacA', 'intIliacA', 'marrow', 'intIliacV', 'commonIliacV', 'ivc');
  chain('commonIliacA', 'extIliacA', 'femoralA', 'deepFemA', 'femur', 'femoralV', 'extIliacV', 'commonIliacV');
  chain('deepFemA', 'quads', 'femoralV');
  edge('pulmCap', 'lungs'); edge('lungs', 'pulmVeins'); // the lung dungeon opens off the pulmonary capillaries

  // ---- places: dungeons, thymus, lymph node towns ----
  const P = (id, name, sub, note, o) => add(id, name, 'place', Object.assign({ sub, note, region: sub === 'town' ? null : id }, o));
  P('marrow', 'Bone Marrow', 'dungeon', 'Red marrow of the ilium, reached by the internal iliac artery. New blood cells leave through venous sinusoids, so there is no lymph route out.');
  P('thymus', 'Thymus', 'thymus', 'Where T cells mature. It is supplied by thymic branches of the internal thoracic artery. Claim milestone upgrades for your class here.');
  P('brain', 'Brain', 'dungeon', 'Reached by the internal carotid artery. Veins drain through the dural venous sinuses to the internal jugular vein.');
  P('eyesears', 'Eyes & Ears', 'dungeon', 'The eye is reached by the ophthalmic artery. The inner ear is really fed by the labyrinthine artery from the basilar system, which this map simplifies.');
  P('glands', 'Glands', 'dungeon', 'The thyroid stands in for the glands here. The adrenals are supplied from the aorta and renal arteries, and the pituitary from the internal carotid.');
  P('heart', 'Heart', 'dungeon', 'Supplied by the coronary arteries. Cardiac veins drain to the coronary sinus and then the right atrium.');
  P('lungs', 'Lungs', 'dungeon', 'Reached through the pulmonary capillaries, where gas exchange happens.');
  P('spleen', 'Spleen', 'dungeon', 'Supplied by the splenic artery. Its blood drains to the liver by the portal vein.');
  P('gut', 'Gut', 'dungeon', 'Supplied by the superior mesenteric artery. Its veins reach the liver first through the hepatic portal system.');
  P('kidneys', 'Kidneys', 'dungeon', 'Supplied by the renal artery. The left renal vein also receives the left gonadal vein.');
  P('gonads', 'Gonads', 'dungeon', 'Supplied by the gonadal arteries from the abdominal aorta. Testes and ovaries drain lymph to the lumbar nodes, not the inguinal nodes.');
  P('femur', 'Femur', 'dungeon', 'Supplied by nutrient arteries from branches of the deep femoral artery.');
  P('quads', 'Quadriceps', 'dungeon', 'Thigh muscles supplied by branches of the deep femoral artery.');
  P('skin', 'Skin', 'dungeon', 'The skin of the arm, reached by the brachial artery.');

  // Lymph node towns. regions = the dungeons that really drain there.
  const towns = [
    { id: 'cervical', accent: '#7fb8e0', name: 'Cervical Nodes', short: 'Cervical', regions: ['brain', 'eyesears', 'glands'], exit: 'thoracicDuct',
      blurb: 'Lymph nodes filter lymph before it returns to the blood, and they are packed with lymphocytes. The cervical nodes drain the head and neck.' },
    { id: 'axillary', accent: '#9fd67f', name: 'Axillary Nodes', short: 'Axillary', regions: ['skin'], exit: 'thoracicDuct',
      blurb: 'The axillary nodes in the armpit drain the arm, the chest wall and the breast.' },
    { id: 'mediastinal', accent: '#e0a07f', name: 'Mediastinal Nodes', short: 'Mediastinal', regions: ['heart', 'lungs', 'thymus'], exit: 'rDuct',
      blurb: 'The mediastinal nodes sit in the chest between the lungs and filter lymph from the heart, lungs and thymus. Lymph from the right side of the chest reaches the blood through the right lymphatic duct.' },
    { id: 'mesenteric', accent: '#e0cf6f', name: 'Mesenteric Nodes', short: 'Mesenteric', regions: ['gut', 'spleen'], exit: 'cisterna',
      blurb: 'The mesenteric nodes filter lymph from the intestines. Fat absorbed from the gut travels in lymphatic vessels called lacteals. This town stands for the celiac and mesenteric chain.' },
    { id: 'lumbar', accent: '#b89fe0', name: 'Lumbar Nodes', short: 'Lumbar', regions: ['kidneys', 'gonads'], exit: 'cisterna',
      blurb: 'The lumbar (para-aortic) nodes lie along the abdominal aorta. They drain the kidneys, testes and ovaries, and lymph from the legs passes through them too.' },
    { id: 'inguinal', accent: '#6fd8c4', name: 'Inguinal Nodes', short: 'Inguinal', regions: ['femur', 'quads'], exit: 'cisterna',
      blurb: 'The inguinal nodes in the groin drain the legs, the external genitals and the lower abdominal wall.' }
  ];
  const lymphOf = {}; // dungeon id -> { vessel, town }
  const LV = (vid, name, note, townId, regionIds) => {
    LY(vid, name, note, { lenMul: 0.9, trap: 'Lymph eddy' });
    regionIds.forEach(r => { edge(r, vid, 'lymphEntry'); lymphOf[r] = { vessel: vid, town: townId }; });
    edge(vid, townId);
  };
  towns.forEach(t => P(t.id, t.name, 'town', t.blurb, { short: t.short, region: null, lymph: true }));

  LY('thoracicDuct', 'Thoracic duct', 'The largest lymphatic vessel. It returns lymph from most of the body to the blood at the left venous angle.', { lenMul: 1.2 });
  LY('cisterna', 'Cisterna chyli', 'A lymph sac in the abdomen where the lumbar and intestinal lymph trunks meet and the thoracic duct begins.', { lenMul: 0.5 });
  LY('rDuct', 'Right lymphatic duct', 'Drains lymph from the right arm and the right side of the head and chest into the right venous angle.', { lenMul: 0.6 });
  LV('lvBrain', 'Meningeal lymphatic vessels', 'Recently recognized lymphatic vessels in the dura carry fluid from around the brain to the deep cervical nodes. Older textbooks say the brain has none.', 'cervical', ['brain']);
  LV('lvHead', 'Lymphatic vessels of the head and face', 'They drain toward the deep cervical nodes.', 'cervical', ['eyesears']);
  LV('lvThyroid', 'Thyroid lymphatic vessels', 'They drain the thyroid to nodes in the neck.', 'cervical', ['glands']);
  LV('lvArm', 'Lymphatic vessels of the arm', 'They drain the arm toward the axillary nodes.', 'axillary', ['skin']);
  LV('lvHeart', 'Cardiac lymphatic vessels', 'They drain the heart toward the mediastinal nodes.', 'mediastinal', ['heart']);
  LV('lvLung', 'Pulmonary lymphatic vessels', 'They drain the lungs toward the mediastinal nodes.', 'mediastinal', ['lungs']);
  LV('lvThymus', 'Thymic lymphatic vessels', 'They drain the thymus toward the mediastinal nodes.', 'mediastinal', ['thymus']);
  LV('lvGut', 'Lacteals and mesenteric lymphatics', 'Lacteals absorb dietary fat. Intestinal lymph passes through the mesenteric nodes.', 'mesenteric', ['gut']);
  LV('lvSpleen', 'Splenic lymphatic vessels', 'The spleen has no afferent lymphatics. Its efferent vessels follow the splenic vessels toward the celiac nodes.', 'mesenteric', ['spleen']);
  LV('lvKidney', 'Renal lymphatic vessels', 'They drain the kidney to the lumbar nodes.', 'lumbar', ['kidneys']);
  LV('lvGonad', 'Gonadal lymphatic vessels', 'They follow the gonadal vessels up to the lumbar nodes.', 'lumbar', ['gonads']);
  LV('lvLeg', 'Deep lymphatic vessels of the thigh', 'They follow the femoral vessels to the deep inguinal nodes.', 'inguinal', ['femur', 'quads']);
  // Towns hand lymph on to the blood.
  towns.forEach(t => edge(t.id, t.exit));
  edge('cisterna', 'thoracicDuct'); edge('thoracicDuct', 'lAngle');
  edge('rDuct', 'rAngle'); chain('rAngle', 'rBrach', 'svc');

  // Wizard and Rogue only: town to town along the node chain (a shortcut, not the flow of lymph).
  const chainLinks = [['cervical', 'axillary'], ['axillary', 'mediastinal'], ['mediastinal', 'thoracicDuct'], ['thoracicDuct', 'cisterna'],
    ['cisterna', 'lumbar'], ['lumbar', 'inguinal'], ['cisterna', 'mesenteric']];
  const adj = {};
  chainLinks.forEach(([a, b]) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); });

  // Where each place sits on the body map: column, row on a 40 x 44 grid, and which side its label goes (l|r).
  const map = {
    brain: [20, 2, 'r'], eyesears: [20, 5, 'r'], glands: [21, 9, 'r'], cervical: [19, 10, 'l'], thymus: [20, 12, 'l'],
    axillary: [29, 13, 'r'], mediastinal: [19, 14, 'l'], heart: [23, 15, 'r'], lungs: [13, 16, 'l'], skin: [35, 21, 'r'],
    spleen: [27, 19, 'r'], lumbar: [17, 20, 'l'], kidneys: [23, 21, 'r'], gut: [20, 23, 'r'], mesenteric: [16, 25, 'l'],
    marrow: [28, 27, 'r'], gonads: [19, 28, 'l'], inguinal: [24, 30, 'r'], quads: [25, 34, 'r'], femur: [24, 39, 'r']
  };

  return { nodes, out, towns, lymphOf, adj, map };
})();
DD.data.town = id => DD.data.circ.towns.find(t => t.id === id);
