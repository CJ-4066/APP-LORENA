import assert from "node:assert/strict";
import test from "node:test";

import { buildEnergyProfile } from "./energy-profile.js";

test("energy profile uses zodiac sign table from esoteric system", () => {
  const profile = buildEnergyProfile({
    zodiacSign: "acuario",
    birthDate: "1990-01-01",
  });

  assert.equal(profile.sign, "Acuario");
  assert.equal(profile.element, "Aire");
  assert.equal(profile.rulingPlanet, "Urano");
  assert.equal(profile.powerColorName, "Azul Eléctrico");
  assert.equal(profile.powerDay, "Sábado");
  assert.equal(profile.energyNumber, 7);
  assert.equal(profile.energyStone, "Fluorita");
  assert.equal(profile.chakra, "Corona");
  assert.equal(profile.ritual, "Innovación, creatividad e inspiración.");
});

test("energy profile normalizes zodiac signs without accents", () => {
  const profile = buildEnergyProfile({ zodiacSign: "Cancer" });

  assert.equal(profile.sign, "Cáncer");
  assert.equal(profile.powerColorName, "Blanco");
  assert.equal(profile.energyStone, "Piedra Luna");
  assert.equal(profile.chakra, "Corazón");
});
