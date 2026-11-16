// NPCs as data (phase 3b). {id, name, kind:"native|town|merchant", regions:[…], lines:{greet:[…], derrick:[…]}, codex}.
// greet lines teach a true fact in first person; derrick lines are affectionate, accurate jokes about Derrick.
// Event-reactive lines come in 5b. Natives are the one-per-floor cells in each dungeon (glyph ☺).
(function () {
  const N = (id, name, regions, greet, derrick, codex) => ({ id, name, kind: 'native', regions, lines: { greet, derrick }, codex });
  const natives = [
    // Bone Marrow
    N('hsc', 'Hematopoietic stem cell', ['marrow'],
      ['I am a hematopoietic stem cell. I can renew myself or differentiate into every type of blood cell.', 'Red bone marrow is where I live, and making blood cells there is called hematopoiesis.'],
      ['Derrick donated blood once and bragged like he built the blood supply. I am the one doing the rebuilding.', 'He said he would give the marrow a rest. Hematopoiesis does not take weekends.'],
      'The ancestor of all blood cells, found in red bone marrow.'),
    N('reticular-marrow', 'Reticular cell', ['marrow'],
      ['I am a reticular cell. I help build the supportive mesh, the stroma, that holds developing blood cells in place.', 'Reticular fibers made by cells like me form the framework of bone marrow, lymph nodes and the spleen.'],
      ['Derrick says his life has no structure. I provide structure to three organs, so he can borrow a fiber.', 'He calls me filler. Without a scaffold, a lymph node is just a puddle.'],
      'A supporting cell in reticular connective tissue.'),
    // Brain
    N('neuron', 'Neuron', ['brain'],
      ['I am a neuron. Dendrites bring signals toward my cell body, and my axon carries them away.', 'On a myelinated axon like mine, the impulse jumps from one node of Ranvier to the next, which makes conduction faster.'],
      ['Derrick drinks alcohol, a central nervous system depressant, then insists he is fine to drive. Judgment slows down first.', 'He says he only uses ten percent of his brain. That is a myth, and I am firing with the rest.'],
      'The signaling cell of the nervous system.'),
    N('astrocyte', 'Astrocyte', ['brain'],
      ['I am an astrocyte. My processes wrap the brain\'s capillaries and help form the blood-brain barrier.', 'I also soak up excess potassium and neurotransmitters around neurons.'],
      ['Derrick is shocked that the blood-brain barrier did not stop alcohol. Ethanol is small and lipid-soluble, so it walks right through.', 'He keeps saying he needs to clear his head. I am literally clearing potassium out of there, buddy.'],
      'A star-shaped glial cell that supports neurons.'),
    // Eyes & Ears
    N('rod', 'Rod cell', ['eyesears'],
      ['I am a rod cell. I work in dim light and give black-and-white vision, while cones handle color.', 'My pigment is rhodopsin, and making it requires vitamin A.'],
      ['Derrick walks into a dark movie theater and stumbles for minutes. Rhodopsin needs time to regenerate after bright light. That is dark adaptation.', 'He ate one carrot and expected night vision. I do need vitamin A, but one carrot will not turn him into an owl.'],
      'A photoreceptor for dim light.'),
    N('hair-cell', 'Hair cell', ['eyesears'],
      ['I am a hair cell in the inner ear. When fluid movement bends my stereocilia, I turn vibration into electrical signals.', 'Mammalian hair cells like me do not regenerate, so noise damage to us is permanent.'],
      ['Derrick runs his earbuds at full volume. I am not rated for that, and I do not grow back.', 'He says what a lot lately. That is not a joke, that is me filing a complaint.'],
      'A sensory cell of the cochlea and balance organs.'),
    // Glands
    N('follicular', 'Thyroid follicular cell', ['glands'],
      ['I am a thyroid follicular cell. I make the thyroid hormones T3 and T4, and I need iodine to do it.', 'TSH from the anterior pituitary tells me when to make more.'],
      ['Derrick has no idea whether his salt is iodized. I build thyroid hormone out of iodine, so he should check.', 'He says he is always tired, then sleeps four hours a night. Thyroid hormone sets metabolic rate, but I cannot fix that one.'],
      'The cell that makes thyroid hormone.'),
    N('chromaffin', 'Chromaffin cell', ['glands'],
      ['I am a chromaffin cell in the adrenal medulla. Under sympathetic stimulation I release epinephrine and norepinephrine.', 'That is the fight-or-flight burst: faster heart rate, wider airways and more glucose in the blood.'],
      ['Derrick watched a scary movie and flew out of his chair. That one is on me.', 'He rode a roller coaster for fun. I dumped epinephrine the whole way up the first hill.'],
      'An adrenal medulla cell that acts like a sympathetic neuron.'),
    // Heart
    N('myocyte', 'Cardiac myocyte', ['heart'],
      ['I am a cardiac myocyte. I am striated and branched, and gap junctions in my intercalated discs link me to my neighbors so we contract together.', 'I am packed with mitochondria, so I need a steady supply of oxygen from the coronary arteries.'],
      ['Derrick ate a double bacon cheeseburger and called it heart-healthy because it had lettuce. My coronary arteries are begging.', 'He says he does not have time to rest. I rest between every beat, and it is the only reason I last a lifetime.'],
      'The contractile cell of the heart wall.'),
    N('sa-node', 'Pacemaker cell (SA node)', ['heart'],
      ['I am a sinoatrial nodal cell. I depolarize on my own, so I set the heart rate without a nerve telling me to.', 'The vagus nerve slows me down, and sympathetic nerves speed me up.'],
      ['Derrick drank three energy drinks. Caffeine raises his heart rate, and I am the one who has to keep up.', 'He says his heart skips a beat around his crush. I am the pacemaker, and I am telling you that is just epinephrine.'],
      'The cells that set the rhythm of the heart.'),
    // Lungs
    N('type2', 'Type II alveolar cell', ['lungs'],
      ['I am a type II alveolar cell. I make surfactant, which lowers surface tension so the alveoli do not collapse.', 'Type I cells form most of the thin gas-exchange surface. I am the cuboidal one that makes surfactant.'],
      ['Derrick says he only smokes at parties. I repair the damage every single time.', 'He was born a few weeks early and has been rushing ever since. Babies born very early may not make enough surfactant yet.'],
      'The alveolar cell that makes surfactant.'),
    N('ciliated', 'Ciliated epithelial cell', ['lungs'],
      ['I am a ciliated epithelial cell. My cilia beat to sweep mucus and trapped debris up and out of your airways. That is the mucociliary escalator.', 'Goblet cells make the mucus. I just move it.'],
      ['Derrick\'s smoking stuns my cilia, so he coughs to do my job.', 'He mowed the lawn without a mask. I sweep dust all day, and I want overtime.'],
      'An airway cell whose cilia move mucus.'),
    // Spleen
    N('red-pulp', 'Red pulp macrophage', ['spleen'],
      ['I am a red pulp macrophage. I remove old, damaged red blood cells, which last about 120 days.', 'I recycle the iron from their hemoglobin, and the heme is broken down into bilirubin.'],
      ['Derrick bruised his shin and said it turned green. That is hemoglobin being broken down into biliverdin and bilirubin. You are welcome.', 'Derrick never thanks me. Every day I remove his worn-out red blood cells.'],
      'A spleen macrophage that clears old red blood cells.'),
    N('reticular-spleen', 'Reticular cell', ['spleen'],
      ['I am a reticular cell in the spleen. My fibers form the mesh in the white pulp where lymphocytes gather.', 'The spleen filters blood, not lymph. No lymph vessels bring lymph into it.'],
      ['Derrick played contact football with mono. An enlarged spleen can rupture, which is why we told him to sit out.', 'He says he can live without me. He is right, people can, but they are more prone to certain infections.'],
      'A supporting cell of the splenic framework.'),
    // Gut
    N('parietal', 'Parietal cell', ['gut'],
      ['I am a parietal cell. I secrete hydrochloric acid and intrinsic factor.', 'Intrinsic factor is what lets you absorb vitamin B12 later in the small intestine.'],
      ['Derrick lies down right after pizza and gets heartburn. Acid comes up when the lower esophageal sphincter lets it.', 'He drinks coffee on an empty stomach. Caffeine stimulates acid secretion, and I am doing my best.'],
      'A stomach cell that makes acid and intrinsic factor.'),
    N('goblet', 'Goblet cell', ['gut'],
      ['I am a goblet cell. I make mucus that lubricates the gut and protects its lining, and there are more of me toward the large intestine.', 'Mucus is mostly water and a protein called mucin.'],
      ['Derrick says feeling slimy is a bad thing. I make mucus for a living, and business is great.', 'He took a stool softener he did not need. I make mucus to ease things along, so thanks for the vote of no confidence.'],
      'A mucus-secreting cell of the intestine.'),
    N('enterocyte', 'Enterocyte', ['gut'],
      ['I am an enterocyte. My microvilli form a brush border that greatly increases my surface area for absorption.', 'I also make brush-border enzymes, like lactase.'],
      ['Derrick had ice cream and regretted it. Lactase is my enzyme, and many adults make less of it.', 'He bought a detox tea. I replace myself every few days, and that is the only detox I do.'],
      'The absorptive cell of the small intestine.'),
    // Kidneys
    N('podocyte', 'Podocyte', ['kidneys'],
      ['I am a podocyte. My foot processes wrap around the glomerular capillaries and leave filtration slits.', 'With the capillary endothelium and the basement membrane, I form the filtration membrane. Water and small solutes pass, but blood cells and large proteins do not.'],
      ['Derrick says foamy urine is just soap. If a filter like me is damaged, protein leaks through, and foamy urine can be a clue.', 'He says he never feels his kidneys work. That is because they filter around 180 liters a day and he only has to pee a couple.'],
      'A cell of the glomerular filtration membrane.'),
    N('jg', 'Juxtaglomerular cell', ['kidneys'],
      ['I am a juxtaglomerular cell. I release renin when blood pressure falls.', 'Renin starts the renin-angiotensin-aldosterone pathway, which raises blood pressure.'],
      ['Derrick ate a family bag of salty chips. His blood volume goes up, and so does his blood pressure.', 'He says he handles pressure well. I am the one who actually senses it.'],
      'A kidney cell that senses pressure and releases renin.'),
    // Gonads
    N('sertoli', 'Sertoli cell', ['gonads'],
      ['I am a Sertoli cell. I nourish developing sperm cells and form the blood-testis barrier.', 'FSH acts on me, and I secrete inhibin to keep FSH in check.'],
      ['Derrick keeps his laptop on his lap because it is warm. Sperm production likes the testes a little cooler than the core body temperature.', 'He soaks in hot tubs and wears skinny jeans. The testes hang outside the body for a reason.'],
      'The supporting cell of the seminiferous tubules.'),
    N('granulosa', 'Granulosa cell', ['gonads'],
      ['I am a granulosa cell. I surround the developing oocyte in its follicle and help make estrogen.', 'After ovulation, follicle cells like me help form the corpus luteum, which makes progesterone.'],
      ['Derrick says he does not understand hormones. I answer to FSH and LH, so he should be nice to his pituitary.', 'He tried to hack his hormones with a podcast. I take instructions from FSH and LH, not podcasts.'],
      'A follicle cell of the ovary.'),
    // Femur
    N('osteocyte', 'Osteocyte', ['femur'],
      ['I am an osteocyte, a mature bone cell living in a lacuna. I reach my neighbors through tiny canaliculi.', 'I help sense mechanical stress, and bone remodels in response to it.'],
      ['Derrick sits twelve hours a day. Bone remodels in response to load, and he is giving me nothing to work with.', 'He calls me dead tissue. I am a living cell inside the matrix, thank you.'],
      'The mature bone cell.'),
    N('osteoblast', 'Osteoblast', ['femur'],
      ['I am an osteoblast. I build bone by secreting osteoid, the collagen-rich matrix that then mineralizes.', 'When I get trapped in the matrix I made, I become an osteocyte.'],
      ['Derrick says weights are only for muscles. Loading bone stimulates us osteoblasts too.', 'He takes calcium pills at random and never lifts a thing. Calcium and vitamin D help, but that is not a plan.'],
      'The bone-building cell.'),
    // Quadriceps
    N('fiber', 'Skeletal muscle fiber', ['quads'],
      ['I am a skeletal muscle fiber, a long multinucleated cell packed with myofibrils.', 'My sarcomeres shorten as actin and myosin filaments slide past each other. That is the sliding filament mechanism.'],
      ['Derrick says soreness is lactic acid. It is mostly microtears and inflammation from unfamiliar work.', 'He skipped leg day again. I am a quadriceps fiber, and I take it personally.'],
      'A muscle cell, and the unit of the muscle.'),
    N('satellite', 'Satellite cell', ['quads'],
      ['I am a satellite cell, a muscle stem cell that sits beside the fiber. I can fuse in to help repair damaged muscle.', 'When I join a fiber, I add my nucleus to it. That is part of how muscle repairs and grows.'],
      ['Derrick lifted three times and thinks he is jacked. I am the one adding nuclei, and I am not done yet.', 'He strained a quad and asked if it could heal by morning. I am a muscle stem cell, not a miracle.'],
      'A stem cell of skeletal muscle.'),
    // Skin
    N('keratinocyte', 'Keratinocyte', ['skin'],
      ['I am a keratinocyte. I fill with keratin as I rise from the stratum basale, and by the stratum corneum I am dead and flat.', 'The stratum corneum is layers of dead keratinized cells, a waterproof barrier against pathogens.'],
      ['Derrick grew a callus on his hand and complained. That is me thickening where there is friction.', 'He picks at his dry skin and then asks why it gets infected. I am the barrier, buddy.'],
      'The main cell of the epidermis.'),
    N('melanocyte', 'Melanocyte', ['skin'],
      ['I am a melanocyte. I make melanin and pass it to keratinocytes, where it shields their DNA from UV light.', 'People have roughly the same number of melanocytes. Skin color differences come from how much and what type of melanin we make.'],
      ['Derrick fell asleep at the beach and woke up lobster-red. I make melanin, but ramping up takes days.', 'He says a base tan is protective. A tan is a response to UV damage, buddy. I am doing my best.'],
      'The pigment-making cell of the epidermis.')
  ];
  const T = (id, name, kind, greet, derrick, codex) => ({ id, name, kind, regions: [], lines: { greet, derrick }, codex });
  const folks = [
    T('plasma', 'Plasma cell', 'town',
      ['I am a plasma cell, a B cell that matured to secrete antibodies. Between batches, I sell supplies.', 'Each plasma cell makes antibodies for just one antigen. I know one thing, and I know it very well.'],
      ['Derrick skipped his flu shot again. A vaccine would have given him memory B cells and a head start.', 'He caught a cold and asked me for antibiotics. I make antibodies, buddy. Antibiotics do not work on viruses.'],
      'Plasma cells are antibody factories that develop from activated B cells.'),
    T('mast', 'Mast cell', 'town',
      ['I am a mast cell. My granules hold histamine, which makes vessels leakier so help can reach a wound. They hold heparin too, an anticoagulant.', 'I sit in the connective tissue near vessels and the skin. Rooms here are quiet, so take a bed.'],
      ['Derrick\'s pollen allergy is me. Allergen binds IgE on my surface, and I dump histamine. Sorry, Derrick.', 'He sleeps four hours a night and wonders why he gets sick. Sleep supports immune function, so my rooms stay full.'],
      'Mast cells are tissue cells that release histamine and heparin from their granules.'),
    T('helper-t', 'Helper T cell', 'town',
      ['I am a helper T cell, CD4 positive. I do not kill anything myself. I release cytokines that direct B cells, cytotoxic T cells and macrophages.', 'I recognize antigen displayed on MHC class II molecules by cells like macrophages and dendritic cells. I have bounties for you.'],
      ['Derrick calls himself a natural leader. I coordinate every arm of the immune response and have never once gotten credit.', 'He skipped sleep again. Cortisol from chronic stress dampens immune responses, and guess whose job gets harder.'],
      'Helper T cells orchestrate adaptive immunity.'),
    T('dendritic', 'Dendritic cell', 'merchant',
      ['I am a dendritic cell. I patrol the tissues, collect antigens, and carry them to a lymph node to show to T cells.', 'Dendritic cells are the best antigen-presenting cells for activating naive T cells. I also sell a few things.'],
      ['Derrick asked if I am named after a tree. I am named for my branching projections, and I am not a neuron, thanks.', 'I carry samples of everything Derrick picks up to the lymph nodes. Everything. Please wash your hands, Derrick.'],
      'Dendritic cells are antigen-presenting cells that link innate and adaptive immunity.')
  ];
  DD.data.npcs = natives.concat(folks);
  DD.data.npc = id => DD.data.npcs.find(n => n.id === id);
  DD.data.npcFriendly = [
    'No worries. Even cells get that one wrong now and then.',
    'Good try! Your repair crews will remember it.',
    'Close enough for a first pass. Now you know.',
    'It happens to the best of us. Even stem cells make mistakes.'
  ];
})();
