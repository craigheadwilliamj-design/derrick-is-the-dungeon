// PLACEHOLDER starter questions (phase 1a). Replaced in 1c with questions from the user's study guides.
DD.data.questions = DD.data.questions || {};
(function () {
  const mk = (n, q, answer, wrong, explain) => ({ id: 'blood-' + String(n).padStart(3, '0'), system: 'blood', q, answer, wrong, explain, source: 'starter', placeholder: true });
  DD.data.questions.blood = [
    mk(1, 'Which protein is the most abundant in blood plasma?', 'Albumin', ['Fibrinogen', 'Globulins', 'Hemoglobin'],
      'Albumin makes up about 60% of plasma protein and is the main contributor to plasma osmotic pressure. Hemoglobin is inside red blood cells, not in the plasma.'),
    mk(2, 'Which formed element carries most of the oxygen in blood?', 'Erythrocytes', ['Platelets', 'Neutrophils', 'Monocytes'],
      'Erythrocytes (red blood cells) are packed with hemoglobin, which binds oxygen.'),
    mk(3, 'Which part of hemoglobin binds oxygen?', 'The iron in heme groups', ['Calcium in the globin chains', 'The red cell membrane', 'Plasma albumin'],
      'Each hemoglobin molecule has four heme groups, and each heme contains one iron atom that binds one O₂.'),
    mk(4, 'Which hormone stimulates red blood cell production?', 'Erythropoietin', ['Thrombopoietin', 'Insulin', 'Renin'],
      'Erythropoietin (EPO) is released mainly by the kidneys when oxygen delivery is low, and it stimulates red marrow to make more red blood cells.'),
    mk(5, 'Which organ is the main source of erythropoietin in adults?', 'Kidneys', ['Pancreas', 'Spleen', 'Adrenal glands'],
      'Kidney cells sense low oxygen and release EPO. This is why chronic kidney disease often causes anemia.'),
    mk(6, 'Platelets are fragments of which large bone marrow cell?', 'Megakaryocytes', ['Erythroblasts', 'Lymphoblasts', 'Monocytes'],
      'Megakaryocytes shed cytoplasm fragments that become platelets (thrombocytes).'),
    mk(7, 'What is the first step of hemostasis after a vessel is cut?', 'Vascular spasm', ['Platelet plug formation', 'Coagulation', 'Fibrinolysis'],
      'The order is vascular spasm, then platelet plug formation, then coagulation. Fibrinolysis dissolves the clot later during repair.'),
    mk(8, 'Which enzyme converts fibrinogen into fibrin during clotting?', 'Thrombin', ['Plasmin', 'Heparin', 'Prothrombin'],
      'Thrombin cleaves soluble fibrinogen into fibrin strands. Prothrombin is thrombin’s inactive precursor, and plasmin breaks down clots.'),
    mk(9, 'Which vitamin is needed for the liver to make several clotting factors?', 'Vitamin K', ['Vitamin C', 'Vitamin D', 'Vitamin A'],
      'Vitamin K is required to make factors II (prothrombin), VII, IX and X. Warfarin works by interfering with vitamin K.'),
    mk(10, 'Which ABO blood type has neither A nor B antigens on its red blood cells?', 'Type O', ['Type A', 'Type B', 'Type AB'],
      'Type O red cells have no A or B antigens, and type O plasma contains both anti-A and anti-B antibodies.'),
    mk(11, 'Which ABO blood type has no anti-A or anti-B antibodies in its plasma?', 'Type AB', ['Type O', 'Type A', 'Type B'],
      'Type AB people have both A and B antigens, so they do not make anti-A or anti-B. This is why AB is called the universal recipient for red cells.'),
    mk(12, 'An Rh-negative mother is exposed to Rh-positive fetal blood. What is the risk in a later Rh-positive pregnancy?', 'Her anti-Rh antibodies can attack the fetus’s red blood cells', ['Her platelets clump in the placenta', 'The fetus cannot make hemoglobin', 'The mother develops polycythemia'],
      'After exposure, the mother can make anti-Rh antibodies. In a later pregnancy these cross the placenta and can cause hemolytic disease of the newborn.'),
    mk(13, 'Which leukocyte is the most abundant in normal blood?', 'Neutrophils', ['Eosinophils', 'Basophils', 'Monocytes'],
      'Neutrophils make up roughly 50–70% of white blood cells and are first responders to bacterial infection.'),
    mk(14, 'What does hematocrit measure?', 'The percentage of blood volume made up of red blood cells', ['The number of white blood cells per microliter', 'The concentration of hemoglobin in plasma', 'The percentage of plasma that is protein'],
      'Hematocrit is the packed red cell volume as a percentage of total blood volume. Normal values are roughly 40–50% in men and 36–44% in women.'),
    mk(15, 'Which white blood cells release histamine and heparin?', 'Basophils', ['Eosinophils', 'Neutrophils', 'Monocytes'],
      'Basophils release histamine (inflammation and allergy) and heparin (an anticoagulant). Eosinophils mostly fight parasites and take part in allergic responses.')
  ];
})();
