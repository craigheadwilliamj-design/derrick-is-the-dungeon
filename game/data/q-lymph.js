// PLACEHOLDER starter questions (phase 1a). Replaced in 1c with questions from the user's study guides.
DD.data.questions = DD.data.questions || {};
(function () {
  const mk = (n, q, answer, wrong, explain) => ({ id: 'lymph-' + String(n).padStart(3, '0'), system: 'lymph', q, answer, wrong, explain, source: 'starter', placeholder: true });
  DD.data.questions.lymph = [
    mk(1, 'Lymph is formed from what?', 'Excess interstitial fluid that enters lymphatic capillaries', ['Bile from the liver', 'Synovial fluid from joints', 'Filtrate from the glomerulus'],
      'Fluid that leaks out of blood capillaries and is not reabsorbed enters lymphatic capillaries and becomes lymph.'),
    mk(2, 'What mainly moves lymph through lymphatic vessels?', 'Skeletal muscle contraction squeezing vessels that have one-way valves', ['Direct pumping by the left ventricle', 'Beating cilia in the vessel walls', 'Gravity alone'],
      'The lymphatic system has no heart-like pump. Muscle contraction, breathing movements and valves keep lymph moving toward the veins.'),
    mk(3, 'Which vessel drains lymph from the right upper limb and the right side of the head and thorax?', 'Right lymphatic duct', ['Thoracic duct', 'Cisterna chyli', 'Azygos vein'],
      'The right lymphatic duct drains that region into the right venous angle. The thoracic duct drains the rest of the body.'),
    mk(4, 'The thoracic duct empties lymph into which vessel?', 'The left subclavian vein, near its junction with the left internal jugular vein', ['The right atrium', 'The inferior vena cava', 'The hepatic portal vein'],
      'The thoracic duct returns lymph to the blood at the left venous angle, where the left subclavian and left internal jugular veins meet.'),
    mk(5, 'What is a main function of lymph nodes?', 'Filtering lymph and housing lymphocytes and macrophages', ['Producing red blood cells', 'Storing bile', 'Making platelets'],
      'Lymph passes through nodes, where macrophages remove debris and pathogens and lymphocytes can respond to antigens.'),
    mk(6, 'Which is the largest lymphoid organ in the body?', 'Spleen', ['Thymus', 'Tonsils', 'Appendix'],
      'The spleen is the largest lymphoid organ. It filters blood, unlike lymph nodes, which filter lymph.'),
    mk(7, 'What is the main job of the spleen’s red pulp?', 'Removing old or damaged red blood cells and recycling their iron', ['Maturing T lymphocytes', 'Producing bile', 'Making erythropoietin'],
      'Macrophages in the red pulp remove aging red blood cells. The white pulp is the part rich in lymphocytes.'),
    mk(8, 'Where do T lymphocytes mature?', 'Thymus', ['Spleen', 'Red bone marrow', 'Tonsils'],
      'T cells begin in red bone marrow but mature in the thymus. B cells mature in the bone marrow.'),
    mk(9, 'Which is an innate (nonspecific) defense?', 'Phagocytosis by neutrophils', ['Antibody production by plasma cells', 'The memory B cell response', 'Clonal selection of T cells'],
      'Innate defenses respond the same way to any pathogen. Antibodies, memory cells and clonal selection belong to adaptive immunity.'),
    mk(10, 'Which cells secrete antibodies?', 'Plasma cells', ['Cytotoxic T cells', 'Macrophages', 'Natural killer cells'],
      'Plasma cells are activated B cells that have differentiated to secrete large amounts of antibody.'),
    mk(11, 'What do cytotoxic T cells mainly attack?', 'Virus-infected cells and tumor cells', ['Free bacteria in the plasma', 'Old red blood cells', 'Mast cells'],
      'Cytotoxic T cells recognize antigens displayed on the surface of body cells and kill those cells. Antibodies and phagocytes handle free bacteria.'),
    mk(12, 'Which antibody class is the most abundant in blood plasma?', 'IgG', ['IgM', 'IgA', 'IgE'],
      'IgG is the most abundant antibody in the blood and is the only class that crosses the placenta.'),
    mk(13, 'Which antibody class is found in secretions such as tears, saliva and breast milk?', 'IgA', ['IgM', 'IgE', 'IgD'],
      'IgA protects mucous membranes and is the main antibody in secretions, including breast milk.'),
    mk(14, 'Which antibody class is mainly responsible for allergic reactions?', 'IgE', ['IgA', 'IgM', 'IgG'],
      'IgE binds to mast cells and basophils. Re-exposure to the allergen triggers them to release histamine.'),
    mk(15, 'What kind of immunity results from receiving a vaccine?', 'Artificially acquired active immunity', ['Naturally acquired active immunity', 'Artificially acquired passive immunity', 'Naturally acquired passive immunity'],
      'A vaccine exposes you to an antigen so that your own immune system makes antibodies and memory cells, which makes it active. Receiving it by injection makes it artificial.')
  ];
})();
