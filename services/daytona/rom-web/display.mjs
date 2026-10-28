// One display mode for solo, online boot and every cabinet reset.
export const DISPLAY_ASPECT=16/9;
export const DISPLAY_SCALE=3;
export function applyDisplay(core){core._rom_aspect(DISPLAY_ASPECT);}
