// Animated character portraits (Eosinophil Ranger + Basophil companion), drawn as layered SVG parts.
// See docs/design.html "Character art & animation" for the style guide and how to add characters.
// Combat emits events with DD.anim.emit(action, values); the portrait plays them one after another.
DD.anim = (function () {
  const MARKUP = `<g stroke="#3a1838" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">
<ellipse id="ea-shadow" cx="205" cy="392" rx="135" ry="13" fill="#000" fill-opacity=".35" stroke="none"/>
<g id="ea-dog" visibility="hidden">
<ellipse cx="0" cy="0" rx="72" ry="8" fill="#000" fill-opacity=".3" stroke="none"/>
<g id="ea-dogbody">
<g id="ea-dogtail"><path d="M-58 -60 C-82 -66 -92 -94 -80 -114 C-74 -100 -66 -92 -52 -84 Z" fill="#c4bdf7"/><circle cx="-78" cy="-98" r="4" fill="#7b1fa8" stroke="none"/></g>
<path d="M-40 -24 L-46 -4 M-16 -22 L-14 -4" stroke-width="22"/>
<path d="M-40 -24 L-46 -4 M-16 -22 L-14 -4" stroke-width="12" stroke="#c4bdf7"/>
<ellipse cx="-47" cy="-3" rx="11" ry="6" fill="#c4bdf7"/><ellipse cx="-13" cy="-3" rx="11" ry="6" fill="#c4bdf7"/>
<path d="M-44 -82 l8 -16 l6 12 l9 -12 l4 14 Z" fill="#c4bdf7"/>
<ellipse cx="-8" cy="-50" rx="60" ry="40" fill="#c4bdf7"/>
<path d="M-48 -62 C-40 -76 -20 -72 -22 -58 C-24 -48 -4 -50 2 -40 C8 -28 -10 -20 -24 -28 C-36 -34 -54 -44 -48 -62 Z" fill="#4a2c5e" fill-opacity=".55" stroke="none"/>
<g fill="#7b1fa8" stroke="none"><circle cx="-50" cy="-66" r="7"/><circle cx="-34" cy="-80" r="6"/><circle cx="-18" cy="-70" r="8"/><circle cx="-60" cy="-44" r="6"/><circle cx="-40" cy="-46" r="7"/><circle cx="-22" cy="-40" r="5"/><circle cx="-6" cy="-60" r="7"/><circle cx="-4" cy="-30" r="6"/><circle cx="10" cy="-50" r="6"/><circle cx="-30" cy="-24" r="6"/><circle cx="-52" cy="-28" r="5"/><circle cx="4" cy="-76" r="5"/><circle cx="-44" cy="-60" r="4"/><circle cx="-12" cy="-84" r="4"/></g>
<path d="M18 -26 L16 -4 M44 -28 L50 -4" stroke-width="22"/>
<path d="M18 -26 L16 -4 M44 -28 L50 -4" stroke-width="12" stroke="#c4bdf7"/>
<ellipse cx="15" cy="-3" rx="11" ry="6" fill="#c4bdf7"/><ellipse cx="52" cy="-3" rx="11" ry="6" fill="#c4bdf7"/>
<g id="ea-doghead">
<circle cx="42" cy="-80" r="32" fill="#c4bdf7"/>
<g fill="#7b1fa8" stroke="none"><circle cx="30" cy="-104" r="4"/><circle cx="48" cy="-110" r="5"/><circle cx="62" cy="-102" r="3"/><circle cx="22" cy="-92" r="3"/><circle cx="40" cy="-96" r="3"/></g>
<path id="ea-earL" d="M38 -110 C22 -126 -6 -118 -10 -96 C-12 -84 -4 -80 0 -86 C4 -98 16 -104 28 -105 Z" fill="#c4bdf7"/>
<path id="ea-earR" d="M48 -110 C62 -126 92 -120 100 -98 C104 -86 98 -80 92 -84 C88 -96 76 -104 62 -104 Z" fill="#c4bdf7"/>
<path d="M28 -94 L41 -87 M64 -94 L52 -87" fill="none" stroke-width="4"/>
<path id="ea-dogouch" visibility="hidden" d="M33 -86 L42 -81 L33 -76 M62 -86 L53 -81 L62 -76" fill="none" stroke="#2a1028" stroke-width="4"/>
<g id="ea-dogeyes">
<ellipse cx="38" cy="-81" rx="4.5" ry="6" fill="#2a1028" stroke="none"/><ellipse cx="57" cy="-81" rx="4.5" ry="6" fill="#2a1028" stroke="none"/>
<circle cx="39.5" cy="-83" r="1.6" fill="#fff" stroke="none"/><circle cx="58.5" cy="-83" r="1.6" fill="#fff" stroke="none"/>
</g>
<circle cx="30" cy="-68" r="6" fill="#7b1fa8" fill-opacity=".45" stroke="none"/>
<ellipse cx="68" cy="-71" rx="5" ry="3.5" fill="#2a1028" stroke="none"/>
<path id="ea-dogmouth" d="M52 -64 C55 -52 66 -52 70 -63 Z" fill="#f07f8a" stroke-width="4"/>
</g>
</g>
</g>
<g id="ea-rig">
<g id="ea-body">
<g id="ea-cape">
<path d="M120 262 C100 300 78 340 58 372 L92 362 L112 376 L140 362 L272 362 L300 376 L322 362 L352 372 C334 340 312 300 288 262 Z" fill="#4a7d3a"/>
<path d="M140 362 L272 362 L262 330 L150 330 Z" fill="#355e2a" stroke="none"/>
<path d="M150 330 L140 362 L272 362 L262 330" fill="#140d10" fill-opacity=".55" stroke="none"/>
</g>
<g id="ea-quiver" transform="rotate(-22 112 200)">
<g id="ea-arrows">
<path d="M98 160 L92 108 M112 158 L110 100 M126 160 L130 110" fill="none"/>
<path d="M92 108 l-10 -8 l4 -14 l8 10 l8 -10 l2 14 Z" fill="#f08a2c"/>
<path d="M110 100 l-10 -8 l4 -14 l8 10 l8 -10 l2 14 Z" fill="#f08a2c"/>
<path d="M130 110 l-10 -8 l4 -14 l8 10 l8 -10 l2 14 Z" fill="#f08a2c"/>
</g>
<rect x="88" y="150" width="50" height="100" rx="9" fill="#8a4a2a"/>
<circle cx="113" cy="172" r="6" fill="#f2c14e"/>
</g>
<path d="M104 245 C84 175 100 118 140 82 L156 70 C166 98 180 104 205 104 C262 104 302 142 302 240 Z" fill="#355e2a"/>
<path id="ea-hoodtip" d="M156 104 C144 82 128 66 108 58 C132 60 154 70 176 98 Z" fill="#4a7d3a"/>
<path d="M164 312 L160 356 M244 312 L248 356" stroke-width="22" stroke="#3a1838"/>
<path d="M164 312 L160 356 M244 312 L248 356" stroke-width="12" stroke="#f8d3c3"/>
<ellipse cx="204" cy="236" rx="98" ry="97" fill="#f8d3c3"/>
<g fill="#ff7a5c" stroke="none" id="ea-granules">
<circle cx="204" cy="152" r="15"/><circle cx="144" cy="182" r="10"/><circle cx="262" cy="176" r="9"/>
<circle cx="126" cy="228" r="13"/><circle cx="284" cy="226" r="11"/><circle cx="204" cy="300" r="14"/>
<circle cx="140" cy="290" r="9"/><circle cx="270" cy="296" r="12"/><circle cx="236" cy="316" r="7"/><circle cx="170" cy="314" r="8"/>
</g>
<path d="M160 214 C186 206 222 206 248 214 C282 214 296 240 290 262 C284 288 256 296 238 282 C226 272 216 262 204 262 C192 262 182 272 170 282 C152 296 124 288 118 262 C112 240 128 214 160 214 Z" fill="#6b2275" stroke="none"/>
<g id="ea-eyes">
<ellipse cx="192" cy="193" rx="7.5" ry="10.5" transform="rotate(-8 192 193)" fill="#2a1028" stroke="none"/>
<ellipse cx="246" cy="191" rx="6" ry="10" transform="rotate(-8 246 191)" fill="#2a1028" stroke="none"/>
<circle cx="196" cy="189" r="2.6" fill="#fff" stroke="none"/>
<circle cx="249" cy="187" r="2.2" fill="#fff" stroke="none"/>
</g>
<path id="ea-brows" d="M176 173 L203 181 M258 171 L234 179" fill="none" stroke-width="5"/>
<path id="ea-happy" visibility="hidden" d="M183 197 Q191 184 199 197 M239 195 Q246 183 253 195" fill="none" stroke="#2a1028" stroke-width="5"/>
<path id="ea-ouch" visibility="hidden" d="M184 185 L199 193 L184 201 M253 184 L240 192 L253 200" fill="none" stroke="#2a1028" stroke-width="5"/>
<path d="M100 226 C104 102 302 96 306 216 C282 146 128 150 100 226 Z" fill="#4a7d3a"/>
<path d="M108 278 C150 300 258 300 300 278 L298 296 C256 318 152 318 110 296 Z" fill="#8a4a2a"/>
<circle cx="204" cy="304" r="11" fill="#f2c14e"/>
<g id="ea-aim">
<g id="ea-bowarm">
<path d="M290 238 L340 238" stroke-width="26" stroke="#3a1838"/>
<path d="M290 238 L340 238" stroke-width="16" stroke="#f8d3c3"/>
<g id="ea-bowflex">
<path id="ea-bow" d="M336 92 C330 80 340 70 350 78 C392 150 392 326 350 398 C340 406 330 396 336 384 C370 320 370 156 336 92 Z" fill="#9a5430"/>
<path d="M357 118 l10 -4 M372 238 l12 0 M357 358 l10 4" stroke="#f2d8a8" stroke-width="5"/>
</g>
</g>
<path id="ea-string" d="M342 86 L232 238 L342 390" fill="none" stroke="#f2d8a8" stroke-width="2.5"/>
<g id="ea-arrow">
<path d="M226 238 L382 238" stroke="#c98a4a" stroke-width="5"/>
<circle cx="392" cy="238" r="10" fill="#ff7a5c"/>
<path d="M226 238 l-18 -12 l10 12 l-10 12 Z" fill="#f08a2c" stroke-width="4"/>
<g id="ea-extra" opacity="0">
<g transform="rotate(-7 226 238)"><path d="M226 238 L382 238" stroke="#c98a4a" stroke-width="5"/><circle cx="392" cy="238" r="9" fill="#ff7a5c"/><path d="M226 238 l-18 -12 l10 12 l-10 12 Z" fill="#f08a2c" stroke-width="4"/></g>
<g transform="rotate(7 226 238)"><path d="M226 238 L382 238" stroke="#c98a4a" stroke-width="5"/><circle cx="392" cy="238" r="9" fill="#ff7a5c"/><path d="M226 238 l-18 -12 l10 12 l-10 12 Z" fill="#f08a2c" stroke-width="4"/></g>
</g>
<g id="ea-abtip" opacity="0">
<circle id="ea-abglow" cx="396" cy="238" r="20" fill="#f2c14e" fill-opacity=".35" stroke="none"/>
<g transform="translate(404 238) rotate(0) scale(1.1)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g>
</g>
<g id="ea-swirl" visibility="hidden"><g class="sw"><g transform="translate(0 0) rotate(0) scale(0.8)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g></g><g class="sw"><g transform="translate(0 0) rotate(0) scale(0.8)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g></g><g class="sw"><g transform="translate(0 0) rotate(0) scale(0.8)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g></g></g>
</g>
<g id="ea-drawarm">
<path d="M138 240 L222 240" stroke-width="28" stroke="#3a1838"/>
<path d="M138 240 L222 240" stroke-width="18" stroke="#f8d3c3"/>
<rect x="150" y="226" width="26" height="28" rx="5" fill="#8a4a2a"/>
<circle cx="163" cy="240" r="4.5" fill="#f2c14e" stroke-width="3"/>
<g id="ea-jarhand" opacity="0" transform="translate(232 222)"><g id="ea-jh-gastric"><path d="M-11 -10 C-15 -6 -15 12 -11 16 L11 16 C15 12 15 -6 11 -10 Z" fill="#c8e04a"/>
<path d="M-11 -2 L11 -2" stroke="#a3bd2c" stroke-width="3" fill="none"/>
<rect x="-9" y="-19" width="18" height="9" rx="3" fill="#8a4a2a"/>
<path d="M-6 2 L-6 10" stroke="#fff" stroke-opacity=".7" stroke-width="3"/></g><g id="ea-jh-bleach" visibility="hidden"><path d="M-9 -14 L9 -14 L13 -4 L13 18 C13 21 11 22 9 22 L-9 22 C-11 22 -13 21 -13 18 L-13 -4 Z" fill="#f4f7fb"/><rect x="-5" y="-22" width="10" height="8" rx="2" fill="#3b82c4"/><rect x="-9" y="2" width="18" height="10" rx="2" fill="#9cc9f0" stroke-width="3"/></g><g id="ea-jh-spray" visibility="hidden"><path d="M-11 -8 H11 V18 Q11 22 7 22 H-7 Q-11 22 -11 18 Z" fill="#bfe9f2"/><rect x="-3" y="-15" width="6" height="7" fill="#fff"/><rect x="-8" y="-22" width="16" height="7" rx="2" fill="#fff"/><path d="M8 -19 L17 -19" stroke-width="5" fill="none"/><path d="M-6 2 L-6 14" stroke="#fff" stroke-opacity=".8" stroke-width="3"/></g></g>
<circle cx="230" cy="240" r="15" fill="#f8d3c3"/>
</g>
</g>
</g>
<g id="ea-fly" visibility="hidden">
<path id="ea-streak" d="M120 238 L216 238" stroke="#ff7a5c" stroke-opacity=".35" stroke-width="3" stroke-dasharray="18 10"/>
<path d="M226 238 L382 238" stroke="#c98a4a" stroke-width="5"/>
<circle cx="392" cy="238" r="10" fill="#ff7a5c"/>
<path d="M226 238 l-18 -12 l10 12 l-10 12 Z" fill="#f08a2c" stroke-width="4"/>
<g id="ea-flyab" visibility="hidden">
<circle cx="396" cy="238" r="20" fill="#f2c14e" fill-opacity=".35" stroke="none"/>
<g transform="translate(404 238) rotate(0) scale(1.1)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g><g transform="translate(140 226) rotate(-20) scale(0.6)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g><g transform="translate(176 250) rotate(15) scale(0.6)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g><g transform="translate(204 232) rotate(-8) scale(0.6)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g>
</g>
</g>
<g id="ea-puff" visibility="hidden"></g>
<text id="ea-dogdmg" visibility="hidden" x="646" y="262" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="30" font-weight="700" fill="#b3a8f5" stroke="#2a1028" stroke-width="6" paint-order="stroke">-12</text>
<text id="ea-heal" visibility="hidden" x="470" y="250" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="28" font-weight="700" fill="#7fd36b" stroke="#2a1028" stroke-width="6" paint-order="stroke">+25</text>
<g id="ea-note" visibility="hidden">
<ellipse cx="0" cy="0" rx="8" ry="6" transform="rotate(-20)" fill="#f2c14e" stroke-width="4"/>
<path d="M7 -2 L7 -32 L20 -25" fill="none" stroke-width="9"/>
<path d="M7 -2 L7 -32 L20 -25" fill="none" stroke="#f2c14e" stroke-width="4"/>
</g>
<ellipse id="ea-zone" cx="622" cy="388" rx="64" ry="10" fill="#d8343f" fill-opacity=".18" stroke="#d8343f" stroke-opacity=".5" stroke-width="2" stroke-dasharray="6 6" opacity="0"/>
<g id="ea-sfx"></g>
<g id="ea-uitem" visibility="hidden">
<g id="ea-ibag"><path d="M-16 -22 L16 -22 C20 -22 22 -18 22 -14 L22 18 C22 24 18 26 14 26 L-14 26 C-18 26 -22 24 -22 18 L-22 -14 C-22 -18 -20 -22 -16 -22 Z" fill="#d8343f"/><path d="M0 -22 L0 -34" stroke-width="7" fill="none"/><path d="M0 -22 L0 -34" stroke="#f3c6c6" stroke-width="3" fill="none"/><rect x="-14" y="-6" width="28" height="16" rx="3" fill="#fff4e8" stroke-width="3"/><text x="0" y="7" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="12" font-weight="700" fill="#2a1028" stroke="none">O-</text></g>
<g id="ea-ishake"><path d="M-16 -14 L16 -14 L12 26 L-12 26 Z" fill="#f2c14e"/><rect x="-19" y="-26" width="38" height="12" rx="4" fill="#4b6fd1"/><rect x="-6" y="-34" width="12" height="8" rx="2" fill="#4b6fd1"/><path d="M-10 4 L10 4" stroke="#fff4e8" stroke-width="4" fill="none"/></g>
<g id="ea-icap"><g transform="rotate(-35)"><rect x="-10" y="-20" width="20" height="40" rx="10" fill="#b3a8f5"/><path d="M-10 0 H10 V10 A10 10 0 0 1 -10 10 Z" fill="#fff4e8" stroke="none"/><rect x="-10" y="-20" width="20" height="40" rx="10" fill="none"/></g></g>
</g>
<g id="ea-jarfly" visibility="hidden"><g id="ea-jf-gastric"><path d="M-11 -10 C-15 -6 -15 12 -11 16 L11 16 C15 12 15 -6 11 -10 Z" fill="#c8e04a"/>
<path d="M-11 -2 L11 -2" stroke="#a3bd2c" stroke-width="3" fill="none"/>
<rect x="-9" y="-19" width="18" height="9" rx="3" fill="#8a4a2a"/>
<path d="M-6 2 L-6 10" stroke="#fff" stroke-opacity=".7" stroke-width="3"/></g><g id="ea-jf-bleach" visibility="hidden"><path d="M-9 -14 L9 -14 L13 -4 L13 18 C13 21 11 22 9 22 L-9 22 C-11 22 -13 21 -13 18 L-13 -4 Z" fill="#f4f7fb"/><rect x="-5" y="-22" width="10" height="8" rx="2" fill="#3b82c4"/><rect x="-9" y="2" width="18" height="10" rx="2" fill="#9cc9f0" stroke-width="3"/></g></g>
<g id="ea-mist"></g>
<g id="ea-splash"></g>
<ellipse id="ea-puddle" visibility="hidden" rx="40" ry="8" fill="#c8e04a" fill-opacity=".55" stroke="#a3bd2c" stroke-width="3"/>
<text id="ea-tdmg" visibility="hidden" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="30" font-weight="700" fill="#c8e04a" stroke="#2a1028" stroke-width="6" paint-order="stroke">-18</text>
<text id="ea-tstat" visibility="hidden" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="15" font-weight="700" fill="#c8e04a" stroke="#2a1028" stroke-width="5" paint-order="stroke">CORRODE</text>
<g id="ea-hfx"></g>
<text id="ea-healE" visibility="hidden" x="204" y="112" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="32" font-weight="700" fill="#7fd36b" stroke="#2a1028" stroke-width="6" paint-order="stroke">+20</text>
<path id="ea-lock" visibility="hidden" d="M0 0" fill="none" stroke="#f2c14e" stroke-width="3" stroke-dasharray="8 7"/>
<g id="ea-pin" visibility="hidden">
<circle r="16" fill="#2a1028" fill-opacity=".55" stroke="#f2c14e" stroke-width="3.5"/>
<path d="M0 -22 L0 -16 M0 16 L0 22 M-22 0 L-16 0 M16 0 L22 0" stroke="#f2c14e" stroke-width="3.5"/>
<g transform="rotate(-90) scale(.8)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g>
</g>
<text id="ea-doghurt" visibility="hidden" x="476" y="280" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="24" font-weight="700" fill="#b3a8f5" stroke="#2a1028" stroke-width="5" paint-order="stroke">-3</text>
<g id="ea-stamp" visibility="hidden">
<circle r="24" fill="#2a1028" fill-opacity=".6" stroke="#f2c14e" stroke-width="4"/>
<path d="M0 -32 L0 -24 M0 24 L0 32 M-32 0 L-24 0 M24 0 L32 0" stroke="#f2c14e" stroke-width="4"/>
<g transform="translate(-1 0) rotate(-90) scale(1.15)"><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#2a1028" stroke-width="8"/><path d="M-9 0 L2 0 L10 -8 M2 0 L10 8" fill="none" stroke="#f2c14e" stroke-width="4"/></g>
<text y="54" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="15" font-weight="700" fill="#f2c14e" stroke="#2a1028" stroke-width="5" paint-order="stroke">MARKED</text>
</g>
<g id="ea-spark" visibility="hidden" stroke="#fff4e8" stroke-width="5"></g>
<text id="ea-dmg" visibility="hidden" x="318" y="168" text-anchor="middle" font-family="JetBrains Mono, ui-monospace, monospace" font-size="34" font-weight="700" fill="#ff7a5c" stroke="#2a1028" stroke-width="6" paint-order="stroke">-12</text>
<path d="M128 386 C118 386 116 372 128 366 L150 360 L148 352 L180 352 L184 386 Z" fill="#6d2a86"/>
<path d="M230 352 L262 352 L264 360 L288 366 C300 372 298 386 288 386 L224 386 Z" fill="#6d2a86"/>
</g>
</g>`;
  // Durations (seconds) the queue waits before starting the next action.
  const DUR = { shot: 1.2, mark: 1.95, scatter: 1.5, hit: 0.85, heal: 1.15, use: 1.9, throw: 1.35, spray: 1.35, recruit: 1.65, allyHeal: 1.05, bite: 1.3 };
  let wrap = null, api = null, queue = [], busy = false, timer = null;

  function rig(root, STAGE) {
  const $ = id => root.querySelector('#ea-' + id);
  const body=$('body'), shadow=$('shadow'), tip=$('hoodtip'), cape=$('cape'), arrows=$('arrows'), eyes=$('eyes'),
        draw=$('drawarm'), arrow=$('arrow'), fly=$('fly'), bowflex=$('bowflex'), str=$('string'),
        rig=$('rig'), ouch=$('ouch'), brows=$('brows'), gran=$('granules'), spark=$('spark'), dmg=$('dmg'),
        abtip=$('abtip'), abglow=$('abglow'), swirl=$('swirl'), sws=[...root.querySelectorAll('#ea-swirl .sw')], flyab=$('flyab'), streak=$('streak'), stamp=$('stamp');
  let mode = 'shot';
  const relAt = () => mode === 'mark' ? 0.8 : mode === 'scatter' ? 0.62 : R;
  const endAt = () => relAt() + (mode === 'mark' ? 1.13 : mode === 'scatter' ? (STAGE ? 1.75 : 0.85) : 0.73);
  const aimG = $('aim'), extra = $('extra'), zone = $('zone'), sfx = $('sfx'), NS = 'http://www.w3.org/2000/svg';
  const AIM = -30, PIV = [250, 238];
  function mkArrow(){
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = '<path d="M-80 0 L80 0" stroke="#c98a4a" stroke-width="5"/><circle cx="90" cy="0" r="9" fill="#ff7a5c"/><path d="M-80 0 l-18 -12 l10 12 l-10 12 Z" fill="#f08a2c" stroke-width="4"/>';
    g.setAttribute('visibility', 'hidden'); sfx.appendChild(g); return g;
  }
  const volley = [-8, 0, 8].map(d => ({ d, el: mkArrow() }));
  const RX = [584, 648, 612, 670, 570, 632, 600], RY = [384, 380, 390, 386, 380, 392, 386];
  const rain = RX.map((x, i) => {
    const drops = [[-50,-170],[15,-210],[60,-150]].map(v => { const c = document.createElementNS(NS,'circle'); c.setAttribute('r', 4.5); c.setAttribute('fill', '#d8343f'); c.setAttribute('stroke-width', 2.5); c.setAttribute('visibility','hidden'); sfx.appendChild(c); return { c, v }; });
    return { x, y: RY[i], delay: i*0.05, el: mkArrow(), drops };
  });
  // ---- Basophil companion ----
  const dogEl = $('dog'), dogB = $('dogbody'), dogTail = $('dogtail'), dogHead = $('doghead'), earL = $('earL'), earR = $('earR'),
        dogEyes = $('dogeyes'), puff = $('puff'), healT = $('heal'), note = $('note'), dogMouth = $('dogmouth'), dogDmg = $('dogdmg');
  const DOGX = 476, DOGY = 388;
  healT.setAttribute('x', DOGX);
  let dogOn = false, sum = -1, heal = -1, bite = -1, pinKick = 0;
  const BITE_END = 1.25, BX = 552;
  const SUM_END = 1.6, HEAL_END = 1.0;
  const puffBits = [...Array(8)].map((_, i) => {
    const g = document.createElementNS(NS, 'path'), star = i % 2 === 0;
    g.setAttribute('d', star ? 'M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z' : 'M-6 0 L6 0');
    g.setAttribute('fill', ['#7fd36b','#f2c14e'][i % 4 < 2 ? 0 : 1]); g.setAttribute('stroke', star ? '#2a1028' : ['#7fd36b','#f2c14e'][i % 4 < 2 ? 0 : 1]);
    g.setAttribute('stroke-width', star ? 2.5 : 4); puff.appendChild(g); return { g, a: i*Math.PI/4 + 0.3 };
  });
  function showPuff(p, cx, cy){
    if (p < 0 || p > 1){ puff.setAttribute('visibility','hidden'); return; }
    puff.setAttribute('visibility','visible');
    puffBits.forEach(b => { const r = 40 + 50*ease(p);
      b.g.setAttribute('transform', `translate(${cx + Math.cos(b.a)*r} ${cy + Math.sin(b.a)*r*0.7}) rotate(${b.a*57.3}) scale(${1.2 - 0.6*p})`);
      b.g.setAttribute('opacity', 1 - p); });
  }
  function dogPose(t){
    let x = DOGX, y = DOGY, tilt = 0, qx = 1, qy = 1, wagSpd = 2.2, hop = 0;
    if (sum >= 0){
      const s = sum;
      if (s < 0.25){ dogEl.setAttribute('visibility','hidden'); }
      else {
        dogEl.setAttribute('visibility','visible');
        if (s < 1.0){ const q = (s - 0.25)/0.75; x = -130 + (DOGX + 130)*ease(q); y = DOGY - Math.abs(Math.sin(q*3*Math.PI))*40*(1 - 0.35*q); tilt = Math.cos(q*3*Math.PI*2)*-8; wagSpd = 4; }
        else { const l = s - 1.0, d = Math.exp(-8*l), c = Math.cos(18*l); qx = 1 + 0.16*d*c; qy = 1 - 0.18*d*c; }
      }
      showPuff(s >= 1.0 ? (s - 1.0)/0.5 : -1, DOGX, DOGY - 55);
    } else if (heal >= 0){
      const h = heal; hop = h < 0.35 ? Math.sin(Math.PI*h/0.35)*18 : 0; wagSpd = 4.5;
      const gl = h < 0.9 ? Math.sin(Math.PI*h/0.9) : 0;
      dogEl.style.filter = gl > 0 ? `drop-shadow(0 0 ${4 + 10*gl}px rgba(127,211,107,${0.9*gl}))` : '';
      showPuff(h < 0.6 ? h/0.6 : -1, DOGX, DOGY - 55);
      healT.setAttribute('visibility','visible');
      healT.setAttribute('transform', `translate(0 ${-30*ease(Math.min(1, h/0.6))})`);
      healT.setAttribute('opacity', h < 0.6 ? 1 : Math.max(0, 1 - (h - 0.6)/0.4));
    } else if (bite >= 0){
      const b = bite; wagSpd = 5;
      if (b < 0.28){ const k = ease(b/0.28); x = DOGX - 10*k; qx = 1 + 0.1*k; qy = 1 - 0.12*k; tilt = Math.sin(b*60)*2*k; }
      else if (b < 0.5){ const p = (b - 0.28)/0.22; x = DOGX - 10 + (BX - DOGX + 10)*ease(p); y = DOGY - Math.sin(Math.PI*p)*42; tilt = 12*p - 4; qx = 0.94; qy = 1.08; }
      else if (b < 0.66){ const l = b - 0.5, d = Math.exp(-14*l); x = BX; tilt = 8; qx = 1 + 0.12*d; qy = 1 - 0.14*d; }
      else if (b < 1.02){ const p = (b - 0.66)/0.36; x = BX + (DOGX - BX)*ease(p); y = DOGY - Math.sin(Math.PI*p)*30; tilt = 8 - 14*p; }
      else { const l = b - 1.02, d = Math.exp(-9*l), c = Math.cos(18*l); qx = 1 + 0.12*d*c; qy = 1 - 0.14*d*c; }
      const open = b >= 0.3 && b < 0.5 ? 1 : (b >= 0.5 && b < 0.56 ? 1 - (b - 0.5)/0.06 : 0);
      dogMouth.setAttribute('transform', `translate(61 -63) scale(${1 + 0.5*open} ${1 + 1.6*open}) translate(-61 63)`);
      showPuff(b >= 0.5 && b < 0.95 ? (b - 0.5)/0.45 : -1, STAGE && marked ? PINX : BX + 92, STAGE && marked ? PINY : DOGY - 72);
      if (STAGE && marked && b < 0.3){ lock.setAttribute('visibility','visible'); lock.setAttribute('opacity', Math.min(1, b/0.1));
        lock.setAttribute('d', `M${DOGX + 70} ${DOGY - 95} Q ${(DOGX + PINX)/2 + 20} ${PINY - 90} ${PINX - 14} ${PINY - 8}`); }
      else lock.setAttribute('visibility','hidden');
      pinKick = b >= 0.5 && b < 0.8 ? 1 - (b - 0.5)/0.3 : 0;
      dogDmg.textContent = '-' + V.bite; dogDmg.setAttribute('fill', V.biteMarked ? '#f2c14e' : '#b3a8f5');
      if (b >= 0.5){ const l = b - 0.5; dogDmg.setAttribute('visibility','visible');
        dogDmg.setAttribute('transform', `translate(0 ${-34*ease(Math.min(1, l/0.45))})`);
        dogDmg.setAttribute('opacity', l < 0.45 ? 1 : Math.max(0, 1 - (l - 0.45)/0.3)); }
      healT.setAttribute('visibility','hidden');
    } else { showPuff(-1); healT.setAttribute('visibility','hidden'); dogDmg.setAttribute('visibility','hidden'); dogMouth.removeAttribute('transform'); lock.setAttribute('visibility','hidden'); pinKick = 0; }
    // shared damage: the pup flinches a beat after the Eosinophil is hit
    let ouchOn = false;
    const hh = dogOn && V.shared > 0 && sum < 0 && bite < 0 ? hit - 0.06 : -1;
    if (hh >= 0){
      const k = Math.min(1, hh/0.04), d = Math.exp(-7*hh);
      x -= 8*k*Math.exp(-5*hh)*Math.cos(10*hh); tilt += -6*k*d*Math.cos(14*hh); qx *= 1 + 0.08*d*Math.cos(16*hh); qy *= 1 - 0.1*d*Math.cos(16*hh);
      ouchOn = hh < 0.4;
      dogHurt.setAttribute('visibility','visible');
      dogHurt.setAttribute('transform', `translate(0 ${-28*ease(Math.min(1, hh/0.5))})`);
      dogHurt.setAttribute('opacity', hh < 0.5 ? 1 : Math.max(0, 1 - (hh - 0.5)/0.3));
    } else dogHurt.setAttribute('visibility','hidden');
    dogOuch.setAttribute('visibility', ouchOn ? 'visible' : 'hidden');
    dogEyes.setAttribute('visibility', ouchOn ? 'hidden' : 'visible');
    // the mark stays on the target and pulses
    if (STAGE && marked && !(mode === 'mark' && atk >= 0)){
      pin.setAttribute('visibility','visible');
      pin.setAttribute('transform', `translate(${PINX} ${PINY}) scale(${1 + 0.06*Math.sin(t*5) + 0.4*pinKick})`);
    } else pin.setAttribute('visibility','hidden');
    if (heal < 0) dogEl.style.filter = '';
    if (!dogOn && sum < 0){ dogEl.setAttribute('visibility','hidden'); return; }
    const pt = t*2*Math.PI/0.55, p = Math.sin(pt);
    dogEl.setAttribute('transform', `translate(${x} ${y - hop}) rotate(${tilt}) scale(1.15)`);
    dogB.setAttribute('transform', `scale(${qx*(1 - 0.012*p)} ${qy*(1 + 0.022*p)})`);
    dogHead.setAttribute('transform', `translate(0 ${-1.6*p})`);
    dogTail.setAttribute('transform', `rotate(${Math.sin(t*2*Math.PI*wagSpd)*20} -54 -70)`);
    earL.setAttribute('transform', `rotate(${Math.sin(pt - 0.9)*6} 32 -110)`);
    earR.setAttribute('transform', `rotate(${Math.sin(pt - 1.1)*-6} 56 -110)`);
    const bl = ((t + 1.3) % 3.7) < 0.12 ? 0.1 : 1;
    dogEyes.setAttribute('transform', `translate(0 -81) scale(1 ${bl}) translate(0 81)`);
  }
  function whistle(s){
    if (s < 0 || s > 0.8){ note.setAttribute('visibility','hidden'); return 0; }
    note.setAttribute('visibility','visible');
    note.setAttribute('transform', `translate(${262 + 30*s} ${168 - 50*s}) rotate(${Math.sin(s*14)*12})`);
    note.setAttribute('opacity', s < 0.5 ? 1 : 1 - (s - 0.5)/0.3);
    return s < 0.3 ? -12*Math.sin(Math.PI*s/0.3) : 0;
  }

  const RAIN_ANG = 76, RAIN_T = 0.2, RAIN_D = 460, RS = 0.55;
  // Scatter Shot extras. a = seconds since the shot started.
  function scatterFx(a){
    const on = mode === 'scatter' && a >= 0, r = relAt(), s = a - r;
    extra.setAttribute('opacity', on && a < r ? Math.min(1, a/0.15) : 0);
    zone.setAttribute('opacity', on && STAGE ? (a < 0.3 ? a/0.3 : s > 1.4 ? Math.max(0, 1 - (s-1.4)/0.3) : 1) : 0);
    // volley leaving upward
    const sx0 = PIV[0] + 50*Math.cos(AIM*Math.PI/180), sy0 = PIV[1] + 50*Math.sin(AIM*Math.PI/180);
    volley.forEach(v => {
      if (!on || s < 0 || s > 0.35){ v.el.setAttribute('visibility','hidden'); return; }
      const th = (AIM + v.d)*Math.PI/180, dist = 1700*s;
      v.el.setAttribute('visibility','visible');
      v.el.setAttribute('transform', `translate(${sx0 + Math.cos(th)*dist} ${sy0 + Math.sin(th)*dist}) rotate(${AIM + v.d})`);
    });
    // rain coming down, sticking, bleeding
    const th = RAIN_ANG*Math.PI/180, cx = Math.cos(th), cy = Math.sin(th);
    rain.forEach(d => {
      const u = STAGE ? s - 0.42 - d.delay : -1;            // time since this arrow started falling
      if (!on || u < 0 || s > 1.72){ d.el.setAttribute('visibility','hidden'); d.drops.forEach(p => p.c.setAttribute('visibility','hidden')); return; }
      const p = Math.min(1, u/RAIN_T), back = RAIN_D*(1 - p);
      const tipX = d.x - cx*back, tipY = d.y - cy*back;
      d.el.setAttribute('visibility','visible');
      d.el.setAttribute('transform', `translate(${tipX - 90*RS*cx} ${tipY + 6 - 90*RS*cy}) rotate(${RAIN_ANG}) scale(${RS})`);
      d.el.setAttribute('opacity', s > 1.4 ? Math.max(0, 1 - (s-1.4)/0.3) : 1);
      const l = u - RAIN_T;                    // time since landing
      d.drops.forEach(q => {
        if (l < 0 || l > 0.45){ q.c.setAttribute('visibility','hidden'); return; }
        q.c.setAttribute('visibility','visible');
        q.c.setAttribute('cx', d.x + q.v[0]*l); q.c.setAttribute('cy', d.y - 6 + q.v[1]*l + 700*l*l);
        q.c.setAttribute('opacity', 1 - l/0.45);
      });
    });
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !reduce.matches, speed = 1, t = 0, last = null, nextBlink = 2, blinkT = -1, atk = -1, hit = -1, looping = false;
  const HEND = 0.8;
  // spark lines radiating from the impact point
  for (let i = 0; i < 7; i++){ const a = -Math.PI/2 + (i-3)*0.42 + Math.PI/2*0.15, c = Math.cos(a), si = Math.sin(a);
    const l = document.createElementNS('http://www.w3.org/2000/svg','path'); l.setAttribute('d', `M${c*10} ${si*10} L${c*24} ${si*24}`); spark.appendChild(l); }
  const V = { hit: 12, shared: 0, bite: 12, biteMarked: false, heal: 20, atp: 6, allyHeal: 25 };
  const P = 2.6, w = 2*Math.PI/P;           // breath period, seconds
  const R = 0.42, END = 1.15;               // release time, attack length
  const ease = x => 1 - Math.pow(1 - x, 3);

  // Attack offsets layered on top of the idle pose. a = seconds since Fire, or -1.
  function attack(a){
    const o = { dx: 0, arrowDx: null, lean: 0, flex: 0, apex: null, flyX: null, aop: 1, squint: 1, aim: 0 };
    if (a < 0) return o;
    const r = relAt(), m = mode === 'mark';
    if (a < r){                              // draw: pull back, lean back, squint, bow bends
      const k = a < 0.32 ? ease(a/0.32) : 1;
      o.dx = -34*k + (a > 0.32 ? Math.sin(a*90)*(m ? 1.4 : 0.8) : 0);
      o.arrowDx = o.dx; o.apex = o.dx; o.lean = -2.5*k*(m ? 1.3 : 1); o.flex = k; o.squint = 1 - (m ? 0.5 : 0.35)*k;
      if (mode === 'scatter'){ o.aim = AIM*ease(Math.min(1, a/0.4)); o.lean = -4*k; }
    } else {                                  // release: arrow flies, string snaps, body springs back
      const s = a - r;
      o.dx = s < 0.06 ? -34 - 10*(s/0.06) : -44*(1 - ease(Math.min(1, (s-0.06)/0.4)));
      o.lean = -2.5*Math.exp(-7*s)*Math.cos(13*s);
      o.flex = Math.exp(-14*s)*Math.cos(30*s);
      o.apex = -34*Math.exp(-9*s)*Math.cos(38*s);
      o.flyX = -34 + 1500*s; if (o.flyX > 360) o.flyX = null;
      if (mode === 'scatter'){ o.flyX = null; o.aim = AIM*(1 - ease(Math.min(1, Math.max(0, (s-0.12)/0.4)))); o.lean = -4*Math.exp(-7*s)*Math.cos(13*s); }
      o.aop = s < 0.4 ? 0 : Math.min(1, (s-0.4)/0.25);
      o.arrowDx = -12*(1 - o.aop);
    }
    return o;
  }

  // Hit reaction offsets. h = seconds since the hit, or -1.
  function hurt(h){
    const o = { kx: 0, lean: 0, qx: 1, qy: 1, flash: false, ouch: false, g: 1 };
    if (h < 0) return o;
    const k = Math.min(1, h/0.04), d = Math.exp(-6*h), c = Math.cos(16*h);
    o.kx = -12*k*Math.exp(-5*h)*Math.cos(9*h);
    o.lean = -7*k*Math.exp(-6*h)*Math.cos(14*h);
    o.qx = 1 + 0.09*d*c; o.qy = 1 - 0.11*d*c;
    o.flash = h < 0.06 || (h > 0.11 && h < 0.15);
    o.ouch = h < 0.42;
    o.g = 1 + 0.14*Math.exp(-7*h)*Math.sin(32*h);
    return o;
  }
  function effects(h){
    dmg.textContent = '-' + V.hit;
    if (h < 0){ spark.setAttribute('visibility','hidden'); dmg.setAttribute('visibility','hidden'); return; }
    if (h < 0.28){ const p = h/0.28; spark.setAttribute('visibility','visible');
      spark.setAttribute('transform', `translate(300 214) scale(${0.6 + 0.9*p})`); spark.setAttribute('opacity', 1 - p); }
    else spark.setAttribute('visibility','hidden');
    dmg.setAttribute('visibility','visible');
    dmg.setAttribute('transform', `translate(0 ${-36*(1 - Math.pow(1 - Math.min(1, h/0.5), 2))})`);
    dmg.setAttribute('opacity', h < 0.5 ? 1 : Math.max(0, 1 - (h-0.5)/0.3));
  }

  // Antibody Mark extras: coating the arrowhead, the coated flight, the stamp.
  const pin = $('pin'), lock = $('lock'), dogHurt = $('doghurt'), dogOuch = $('dogouch');
  const PINX = 636, PINY = 318;
  let marked = false;
  function markFx(a){
    const on = mode === 'mark' && a >= 0, r = relAt();
    const coat = on && a < r ? Math.min(1, Math.max(0, (a - 0.15)/0.5)) : 0;
    abtip.setAttribute('opacity', on && a < r ? coat : 0);
    abglow.setAttribute('r', 18 + 4*Math.sin(a*22));
    if (on && a < 0.65){
      swirl.setAttribute('visibility','visible');
      const p = Math.min(1, a/0.65);
      sws.forEach((g, i) => { const th = a*9 + i*2.094, rad = 46*(1 - ease(p));
        g.setAttribute('transform', `translate(${396 + Math.cos(th)*rad} ${238 + Math.sin(th)*rad}) rotate(${th*57.3 + 180})`); g.setAttribute('opacity', 1 - p*0.6); });
    } else swirl.setAttribute('visibility','hidden');
    flyab.setAttribute('visibility', on ? 'inherit' : 'hidden');
    streak.setAttribute('stroke', on ? '#f2c14e' : '#ff7a5c');
    const st = on ? a - r - 0.16 : -1;
    if (STAGE && st >= 0 && st < 0.95){
      const pop = st < 0.18 ? 1.5 - 0.5*ease(st/0.18) : 1;
      stamp.setAttribute('visibility','visible');
      const m = st < 0.6 ? 0 : ease((st - 0.6)/0.35);       // shrink down onto the target
      stamp.setAttribute('transform', `translate(${596 + (PINX - 596)*m} ${120 + (PINY - 120)*m}) scale(${pop*(1 - 0.45*m)}) rotate(${st < 0.18 ? (1 - st/0.18)*-20 : 0})`);
      stamp.setAttribute('opacity', 1);
      stamp.querySelector('text').setAttribute('opacity', 1 - m);
    } else stamp.setAttribute('visibility','hidden');
    if (st >= 0.95) marked = true;
  }

  // ---- Eosinophil heal ----
  const hfx = $('hfx'), healE = $('healE'), happy = $('happy');
  let ehl = -1, hcol = [127,211,107]; const EHL_END = 1.1;
  function healStyle(kind){
    const atp = kind === 'atp'; hcol = atp ? [242,193,78] : [127,211,107];
    const hex = atp ? '#f2c14e' : '#7fd36b';
    healE.textContent = atp ? '+' + V.atp + ' ATP' : '+' + V.heal; healE.setAttribute('fill', hex);
    pluses.forEach(p => { p.g.setAttribute('fill', hex);
      p.g.setAttribute('d', atp ? 'M2 -11 L-6 1 L0 1 L-3 11 L7 -2 L1 -2 Z' : 'M-3 -9 H3 V-3 H9 V3 H3 V9 H-3 V3 H-9 V-3 H-3 Z'); });
  }
  const pluses = [...Array(9)].map((_, i) => {
    const g = document.createElementNS(NS, 'path');
    g.setAttribute('d', 'M-3 -9 H3 V-3 H9 V3 H3 V9 H-3 V3 H-9 V-3 H-3 Z');
    g.setAttribute('fill', '#7fd36b'); g.setAttribute('stroke', '#2a1028'); g.setAttribute('stroke-width', 2.5);
    g.setAttribute('visibility', 'hidden'); hfx.appendChild(g);
    return { g, x: 110 + i*24 + (i % 2)*10, y0: 340 - (i % 3)*30, delay: (i*0.37 % 1)*0.35, sc: 1.1 + (i % 3)*0.3 };
  });
  function healFx(e){
    if (e < 0){ pluses.forEach(p => p.g.setAttribute('visibility','hidden')); healE.setAttribute('visibility','hidden'); return { lift: 0, qy: 1, glow: 0, happy: false }; }
    pluses.forEach(p => { const u = (e - p.delay)/0.7;
      if (u < 0 || u > 1){ p.g.setAttribute('visibility','hidden'); return; }
      p.g.setAttribute('visibility','visible');
      p.g.setAttribute('transform', `translate(${p.x + Math.sin(u*6 + p.x)*6} ${p.y0 - 150*ease(u)}) scale(${p.sc*(u < 0.2 ? u/0.2 : 1)})`);
      p.g.setAttribute('opacity', u < 0.6 ? 1 : 1 - (u - 0.6)/0.4); });
    healE.setAttribute('visibility','visible');
    healE.setAttribute('transform', `translate(0 ${-30*ease(Math.min(1, e/0.6))})`);
    healE.setAttribute('opacity', e < 0.7 ? 1 : Math.max(0, 1 - (e - 0.7)/0.4));
    const sw = Math.sin(Math.PI*Math.min(1, e/0.7));
    return { lift: -6*sw, qy: 1 + 0.05*sw, glow: e < 0.9 ? Math.sin(Math.PI*e/0.9) : 0, happy: e < 0.85 };
  }

  // ---- items ----
  const uitem = $('uitem'), ibag = $('ibag'), ishake = $('ishake'), jarhand = $('jarhand'), jarfly = $('jarfly'),
        splash = $('splash'), puddle = $('puddle'), tdmg = $('tdmg'), tstat = $('tstat');
  let use = -1, useKind = 'heal', thr = -1, tkind = 'gastric';
  const mist = $('mist');
  const extraNums = [0, 1].map(() => { const c = tdmg.cloneNode(true); c.removeAttribute('id'); tdmg.parentNode.insertBefore(c, tstat); return c; });
  const KIND = {
    gastric: { col: '#c8e04a', edge: '#a3bd2c', dmg: '-18', stat: 'CORRODE', all: false, spread: 1, pud: 1 },
    bleach:  { col: '#eef6ff', edge: '#9cc9f0', dmg: '-14', stat: 'WEAKEN', all: true, spread: 1.6, pud: 1.6 },
    spray:   { col: '#7fe0e8', edge: '#3fb6c4', dmg: '-10', stat: '', all: true }
  };
  const ZX = [546, 598, 650];
  const mistBits = [...Array(36)].map((_, i) => { const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', 3 + (i % 4)*2); c.setAttribute('fill', '#7fe0e8'); c.setAttribute('fill-opacity', '.75'); c.setAttribute('stroke', 'none'); c.setAttribute('visibility','hidden'); mist.appendChild(c);
    return { c, pump: i % 3, ang: -0.22 + ((i*7) % 12)/12*0.55, spd: 640 + (i % 5)*70, jit: (i % 6) - 3 }; });
  function showNums(l, tx, ty, K){
    const rise = -30*ease(Math.min(1, l/0.45)), fade = l < 0.45 ? 1 : Math.max(0, 1 - (l - 0.45)/0.3);
    const xs = K.all ? ZX : [tx];
    [tdmg, ...extraNums].forEach((e, i) => {
      if (i >= xs.length){ e.setAttribute('visibility','hidden'); return; }
      e.textContent = K.dmg; e.setAttribute('fill', K.col); e.setAttribute('visibility','visible');
      e.setAttribute('x', xs[i]); e.setAttribute('y', (K.all ? 330 + (i % 2)*-18 : ty - 44) + rise); e.setAttribute('opacity', fade);
      e.setAttribute('font-size', K.all ? 24 : 30);
    });
    if (K.stat){ tstat.textContent = K.stat; tstat.setAttribute('fill', K.col); tstat.setAttribute('visibility','visible');
      tstat.setAttribute('x', K.all ? 598 : tx); tstat.setAttribute('y', (K.all ? 362 : ty - 22) + rise); tstat.setAttribute('opacity', fade); }
  }
  function sprayFx(a){
    const o = { rot: 0, lean: 0, arrowOp: 1 }, K = KIND.spray;
    o.arrowOp = a < 0.15 ? 1 - a/0.15 : a < 1.05 ? 0 : Math.min(1, (a - 1.05)/0.2);
    jarhand.setAttribute('opacity', a < 1.0 ? Math.min(1, a/0.12) : Math.max(0, 1 - (a - 1.0)/0.1));
    if (a < 0.3) o.rot = -18*ease(Math.max(0, (a - 0.1)/0.2));
    else if (a < 0.95){ o.rot = -18; const ph = ((a - 0.3)/0.2) % 1; o.lean = 1.2*Math.sin(ph*Math.PI); }
    else o.rot = -18*(1 - ease(Math.min(1, (a - 0.95)/0.25)));
    // pump squish on the bottle
    const ph = a >= 0.3 && a < 0.9 ? ((a - 0.3)/0.2) % 1 : 1;
    $('jh-spray').setAttribute('transform', `translate(0 ${ph < 0.3 ? 3 : 0}) scale(1 ${ph < 0.3 ? 0.9 : 1})`);
    const nx = 262, ny = 196;           // nozzle, roughly, in the raised pose
    mistBits.forEach(m => {
      const u = a - 0.3 - m.pump*0.2;
      if (u < 0 || u > 0.65){ m.c.setAttribute('visibility','hidden'); return; }
      m.c.setAttribute('visibility','visible');
      const d = m.spd*u*(1 - 0.4*u);
      m.c.setAttribute('cx', nx + Math.cos(m.ang)*d); m.c.setAttribute('cy', ny + Math.sin(m.ang)*d + 120*u*u + m.jit*u*20);
      m.c.setAttribute('r', (3 + (m.pump + 1)*1.5)*(1 + 2.2*u)); m.c.setAttribute('opacity', 1 - u/0.65);
    });
    if (STAGE && a >= 0.95) showNums(a - 0.95, 600, 366, K);
    return o;
  }
  const USE_END = 0.72, THR_END = STAGE ? 1.75 : 1.3, TREL = 0.47, TIMP = 1.0;
  const drops = [...Array(10)].map((_, i) => { const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', 4 + (i % 3)*2); c.setAttribute('fill', '#c8e04a'); c.setAttribute('stroke-width', 2.5); c.setAttribute('visibility','hidden'); splash.appendChild(c);
    const a = -Math.PI + (i + 0.5)*Math.PI/10; return { c, vx: Math.cos(a)*(140 + (i % 4)*40), vy: Math.sin(a)*(220 + (i % 3)*60) }; });
  function useFx(u){
    if (u < 0){ uitem.setAttribute('visibility','hidden'); return; }
    uitem.setAttribute('visibility','visible');
    ibag.setAttribute('visibility', useKind === 'heal' ? 'inherit' : 'hidden');
    ishake.setAttribute('visibility', useKind === 'atp' ? 'inherit' : 'hidden');
    $('icap').setAttribute('visibility', useKind === 'other' ? 'inherit' : 'hidden');
    let x = 204, y = 92, sc = 1;
    if (u < 0.18) sc = 1.4*ease(u/0.18) - (u > 0.12 ? 0.4*(u - 0.12)/0.06 : 0);
    else if (u < 0.5) y = 92 + Math.sin((u - 0.18)*16)*4;
    else { const p = (u - 0.5)/0.22; y = 92 + 130*p*p; sc = 1 - 0.8*p; }
    uitem.setAttribute('transform', `translate(${x} ${y}) scale(${Math.max(0.05, sc)}) rotate(${u < 0.5 ? Math.sin(u*12)*8 : 0})`);
  }
  function target(){ return marked && !KIND[tkind].all ? [PINX, PINY] : KIND[tkind].all ? [600, 366] : [622, 366]; }
  // throw: returns pose offsets for the Eosinophil
  function throwFx(a){
    const o = { rot: 0, lean: 0, arrowOp: 1, active: a >= 0 };
    [jarfly, puddle, tdmg, tstat, ...extraNums].forEach(e => e.setAttribute('visibility','hidden'));
    mistBits.forEach(m => m.c.setAttribute('visibility','hidden'));
    ['gastric','bleach','spray'].forEach(k => $('jh-' + k).setAttribute('visibility', k === tkind ? 'inherit' : 'hidden'));
    ['gastric','bleach'].forEach(k => $('jf-' + k).setAttribute('visibility', k === tkind ? 'inherit' : 'hidden'));
    drops.forEach(d => d.c.setAttribute('visibility','hidden'));
    jarhand.setAttribute('opacity', 0);
    if (a < 0) return o;
    if (tkind === 'spray') return sprayFx(a);
    const K = KIND[tkind];
    o.arrowOp = a < 0.15 ? 1 - a/0.15 : a < 0.95 ? 0 : Math.min(1, (a - 0.95)/0.2);
    if (a < TREL) jarhand.setAttribute('opacity', Math.min(1, a/0.12));
    if (a < 0.15) o.rot = 0;
    else if (a < 0.4){ const k = ease((a - 0.15)/0.25); o.rot = -55*k; o.lean = -3*k; }
    else if (a < 0.5){ const k = (a - 0.4)/0.1; o.rot = -55 + 85*k; o.lean = -3 + 6*k; }
    else { const k = ease(Math.min(1, (a - 0.5)/0.35)); o.rot = 30*(1 - k); o.lean = 3*(1 - k); }
    const [tx, ty] = target();
    if (a >= TREL && a < TIMP){                 // jar in flight
      const p = (a - TREL)/(TIMP - TREL), sx0 = 236, sy0 = 230;
      jarfly.setAttribute('visibility','visible');
      jarfly.setAttribute('transform', `translate(${sx0 + (tx - sx0)*p} ${sy0 + (ty - sy0)*p - 150*Math.sin(Math.PI*p)}) rotate(${p*540})`);
    }
    if (STAGE && a >= TIMP){                    // smash
      const l = a - TIMP;
      drops.forEach(d => { if (l > 0.5) return; d.c.setAttribute('visibility','visible'); d.c.setAttribute('fill', K.col);
        d.c.setAttribute('cx', tx + d.vx*K.spread*l); d.c.setAttribute('cy', ty + d.vy*l + 900*l*l); d.c.setAttribute('opacity', 1 - l/0.5); });
      const pg = Math.min(1, l/0.25);
      puddle.setAttribute('visibility','visible');
      puddle.setAttribute('fill', K.col); puddle.setAttribute('stroke', K.edge);
      puddle.setAttribute('transform', `translate(${tx} ${ty + 16}) scale(${(0.3 + 0.9*ease(pg))*K.pud} 1)`);
      puddle.setAttribute('opacity', l < 0.5 ? 1 : Math.max(0, 1 - (l - 0.5)/0.25));
      showNums(l, tx, ty, K);
    }
    return o;
  }

  function pose(t){
    const b = Math.sin(t*w), A = attack(atk), H = hurt(hit);
    const sy = 1 + 0.018*b, sx = 1 - 0.012*b, ty = -3*b;
    const hopY = whistle(sum), HL = healFx(ehl), TW = throwFx(thr), L = A.lean + H.lean + TW.lean;
    useFx(use);
    body.setAttribute('transform', `translate(${204 + H.kx} ${386 + ty + hopY + HL.lift}) rotate(${L}) scale(${sx*H.qx} ${sy*H.qy*HL.qy}) translate(-204 -386)`);
    rig.style.filter = H.flash ? 'brightness(2.3) saturate(0.25)' : HL.glow > 0 ? `drop-shadow(0 0 ${4 + 10*HL.glow}px rgba(${hcol.join(',')},${0.9*HL.glow}))` : '';
    happy.setAttribute('visibility', HL.happy && !H.ouch ? 'visible' : 'hidden');
    ouch.setAttribute('visibility', H.ouch ? 'visible' : 'hidden');
    gran.setAttribute('transform', `translate(204 240) scale(${H.g}) translate(-204 -240)`);
    effects(hit);
    markFx(atk);
    scatterFx(atk);
    dogPose(t);
    aimG.setAttribute('transform', `rotate(${A.aim} ${PIV[0]} ${PIV[1]})`);
    shadow.setAttribute('transform', `translate(205 392) scale(${1-0.035*b} 1) translate(-205 -392)`);
    tip.setAttribute('transform', `rotate(${Math.sin(t*w-0.9)*6 + L*1.8} 166 100)`);
    cape.setAttribute('transform', `translate(204 262) skewX(${Math.sin(t*w*0.75-1.2)*3 - L*1.4}) translate(-204 -262)`);
    arrows.setAttribute('transform', `rotate(${Math.sin(t*w-1.1)*3.5 - L*2.2} 112 158)`);
    const idle = atk < 0 && thr < 0 ? Math.sin(t*w*1.3+0.4)*1.6 : 0;   // tension wobble only while idling
    draw.setAttribute('transform', `translate(${idle + A.dx} 0) rotate(${TW.rot} 150 240)`);
    arrow.setAttribute('transform', `translate(${A.arrowDx === null ? idle : A.arrowDx} 0)`);
    arrow.setAttribute('opacity', A.aop*TW.arrowOp);
    const fsx = 1 + 0.10*A.flex, fsy = 1 - 0.035*A.flex;
    bowflex.setAttribute('transform', `translate(340 238) scale(${fsx} ${fsy}) translate(-340 -238)`);
    const top = 238 - 152*fsy, bot = 238 + 152*fsy, tx = 340 + 2*fsx;
    str.setAttribute('d', `M${tx} ${top} L${232 + (A.apex === null ? idle : A.apex)} 238 L${tx} ${bot}`);
    if (A.flyX === null) fly.setAttribute('visibility', 'hidden');
    else { fly.setAttribute('visibility', 'visible'); fly.setAttribute('transform', `translate(${A.flyX} ${ty})`); }
    let s = 1;
    if (blinkT >= 0){ const k = blinkT/0.16; s = k < 0.5 ? 1-1.8*k : 0.1+1.8*(k-0.5); s = Math.max(0.1, Math.min(1, s)); }
    eyes.setAttribute('transform', `translate(0 192) scale(1 ${s*A.squint}) translate(0 -192)`);
    eyes.setAttribute('visibility', H.ouch || HL.happy ? 'hidden' : 'visible');
  }

  function frame(now){
    if (!root.isConnected){ looping = false; last = null; return; }
    if (!(playing || atk >= 0 || hit >= 0 || sum >= 0 || heal >= 0 || bite >= 0 || ehl >= 0 || use >= 0 || thr >= 0)){ looping = false; last = null; return; }
    if (last !== null){
      const dt = Math.min(0.05, (now-last)/1000)*speed;
      if (playing){
        t += dt;
        if (blinkT >= 0){ blinkT += dt; if (blinkT > 0.16){ blinkT = -1; nextBlink = t + 2.5 + Math.random()*2.5; } }
        else if (t > nextBlink) blinkT = 0;
      }
      if (atk >= 0){ atk += dt; if (atk > endAt()) atk = -1; }
      if (sum >= 0){ sum += dt; if (sum > SUM_END){ sum = -1; dogOn = true; } }
      if (heal >= 0){ heal += dt; if (heal > HEAL_END) heal = -1; }
      if (use >= 0){ use += dt; if (use > USE_END){ use = -1; useFx(-1); if (useKind !== 'other'){ healStyle(useKind); ehl = 0; } } }
      if (thr >= 0){ thr += dt; if (thr > THR_END){ thr = -1; throwFx(-1); } }
      if (ehl >= 0){ ehl += dt; if (ehl > EHL_END){ ehl = -1; healFx(-1); } }
      if (bite >= 0){ bite += dt; if (bite > BITE_END) bite = -1; }
      if (hit >= 0){ hit += dt; if (hit > HEND){ hit = -1; effects(-1); } }
    }
    last = now; pose(t); requestAnimationFrame(frame);
  }
  function kick(){ if (!looping){ looping = true; last = null; requestAnimationFrame(frame); } }

  function fire(m){
    if (atk >= 0 || thr >= 0) return;
    mode = m === 'mark' || m === 'scatter' ? m : 'shot';
    if (reduce.matches && mode === 'scatter'){         // reduced motion: arrows are simply there in the target area, then gone
      rain.forEach(d => { const th = RAIN_ANG*Math.PI/180; d.el.setAttribute('opacity',1); d.el.setAttribute('visibility','visible'); d.el.setAttribute('transform', `translate(${d.x - 90*RS*Math.cos(th)} ${d.y + 6 - 90*RS*Math.sin(th)}) rotate(${RAIN_ANG}) scale(${RS})`); });
      setTimeout(() => rain.forEach(d => d.el.setAttribute('visibility','hidden')), 900); return;
    }
    if (reduce.matches && mode === 'mark'){
      marked = true;
      arrow.setAttribute('opacity', 0); stamp.setAttribute('transform','translate(596 120)'); stamp.setAttribute('opacity',1); stamp.setAttribute('visibility','visible');
      setTimeout(() => { arrow.setAttribute('opacity', 1); stamp.setAttribute('visibility','hidden'); }, 900); return;
    }
    if (reduce.matches){                      // reduced motion: no travel, the arrow is simply spent and restocked
      arrow.setAttribute('opacity', 0); setTimeout(() => arrow.setAttribute('opacity', 1), 450); return;
    }
    atk = 0; kick();
  }
  function recruit(){
    if (sum >= 0 || heal >= 0 || bite >= 0) return;
    if (reduce.matches){
      if (!dogOn){ dogOn = true; pose(t); }
      else { healT.removeAttribute('transform'); healT.setAttribute('opacity',1); healT.setAttribute('visibility','visible'); setTimeout(() => healT.setAttribute('visibility','hidden'), 800); }
      return;
    }
    if (dogOn) heal = 0; else sum = 0;
    kick();
  }
  function doBite(){
    if (!dogOn || sum >= 0 || heal >= 0 || bite >= 0) return;
    if (reduce.matches){ dogDmg.removeAttribute('transform'); dogDmg.setAttribute('opacity',1); dogDmg.setAttribute('visibility','visible'); setTimeout(() => dogDmg.setAttribute('visibility','hidden'), 800); return; }
    bite = 0; kick();
  }
  function healSelf(){
    if (ehl >= 0) return;
    if (reduce.matches){ happy.setAttribute('visibility','visible'); eyes.setAttribute('visibility','hidden'); healE.removeAttribute('transform'); healE.setAttribute('opacity',1); healE.setAttribute('visibility','visible');
      setTimeout(() => { happy.setAttribute('visibility','hidden'); eyes.setAttribute('visibility','visible'); healE.setAttribute('visibility','hidden'); }, 800); return; }
    healStyle('heal'); ehl = 0; kick();
  }
  function useItem(kind){
    if (use >= 0 || ehl >= 0) return;
    useKind = kind;
    if (reduce.matches){ if (kind === 'other') return; healStyle(kind); healE.removeAttribute('transform'); healE.setAttribute('opacity',1); healE.setAttribute('visibility','visible'); setTimeout(() => healE.setAttribute('visibility','hidden'), 800); return; }
    use = 0; kick();
  }
  function throwJar(kind){
    if (thr >= 0 || atk >= 0) return;
    tkind = kind || 'gastric';
    if (reduce.matches){ const [tx, ty] = target(); showNums(0, tx, ty, KIND[tkind]); setTimeout(() => [tdmg, tstat, ...extraNums].forEach(e => e.setAttribute('visibility','hidden')), 900); return; }
    thr = 0; kick();
  }
  function takeHit(){
    if (reduce.matches){                      // reduced motion: eyes shut and the number shows, no movement
      ouch.setAttribute('visibility','visible'); eyes.setAttribute('visibility','hidden');
      dmg.removeAttribute('transform'); dmg.setAttribute('opacity',1); dmg.setAttribute('visibility','visible');
      setTimeout(() => { ouch.setAttribute('visibility','hidden'); eyes.setAttribute('visibility','visible'); dmg.setAttribute('visibility','hidden'); }, 700);
      return;
    }
    if (atk >= 0 && atk < relAt()) atk = -1;        // getting hit mid-draw cancels the shot
    hit = 0; kick();
  }
    function setValues(v) { Object.assign(V, v || {}); }
    function setDog(on) { if (sum < 0 && bite < 0) { dogOn = !!on; if (!on) heal = -1; } }
    function setMarked(on) { marked = !!on; }
    function start() { pose(t); kick(); }
    function play(a, v) {
      setValues(v);
      if (a === 'shot' || a === 'mark' || a === 'scatter') fire(a);
      else if (a === 'hit') takeHit();
      else if (a === 'heal') healSelf();
      else if (a === 'use') useItem(v && (v.kind === 'atp' || v.kind === 'other') ? v.kind : 'heal');
      else if (a === 'throw') throwJar(v && v.kind ? v.kind : 'gastric');
      else if (a === 'recruit') { dogOn = false; recruit(); }
      else if (a === 'allyHeal') { dogOn = true; recruit(); }
      else if (a === 'bite') doBite();
    }
    return { play, setDog, setMarked, start, reduced: () => reduce.matches };
  }

  function portrait() {
    if (!wrap) {
      wrap = document.createElement('div'); wrap.className = 'portrait';
      wrap.innerHTML = '<svg viewBox="40 44 560 366" role="img" aria-label="Your Eosinophil Ranger, bow drawn, with the Basophil pup when recruited">' + MARKUP + '</svg>';
      api = rig(wrap, false);
    }
    return wrap;
  }
  function next() {
    timer = null; busy = false;
    if (!api || !wrap.isConnected || !queue.length) { queue = []; return; }
    const ev = queue.shift(); busy = true;
    api.play(ev.a, ev.v);
    const d = api.reduced() ? 0.5 : (ev.a === 'use' && ev.v && ev.v.kind === 'other' ? 0.8 : DUR[ev.a] || 1);
    timer = setTimeout(next, d * 1000);
  }
  return {
    // Portrait for this class, or null when the class has no art yet (the glyph stays).
    forClass(classId) {
      if (classId !== 'eosinophil' || typeof document.createElementNS !== 'function' || !window.matchMedia) return null;
      try { return portrait(); } catch (err) { wrap = null; api = null; return null; }
    },
    // Called on every combat render: re-attach, sync companion and mark, start idling.
    sync(C) {
      if (!api || !wrap.isConnected) return;
      if (!busy) { api.setDog(C.ally && C.ally.hp > 0); api.setMarked(C.mark != null); }
      api.start();
      if (!busy && queue.length) next();
    },
    emit(a, v) { if (!api) return; queue.push({ a, v: v || {} }); },
    // New fight: drop anything left over and match the companion state.
    reset(C) { queue = []; busy = false; if (timer) clearTimeout(timer); timer = null; if (api) api.setDog(!!(C && C.ally && C.ally.hp > 0)); }
  };
})();
