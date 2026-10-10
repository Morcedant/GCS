# GCS
GCS Templates

## USS Pelion Officer Creator

`uss-pelion/index.html` is a self-contained character creator and play sheet for the
*USS Pelion* Players' Guide (3d6 roll-under, campaign year 2268). Open it in any browser; no build step.

- **Look**: a Strange New Worlds-style bridge console with a delta insignia and accent color that follow the department.
- **Create**: the guide's five steps: department (including General Services for enlisted Crewman and Yeoman ranks), species with net-zero attribute adjustments (Human, Vulcan, Andorian, Tellarite, Aenar, Illyrian, Lanthanite, Caitian, Aurelian, Orion, Denobulan, or custom), attributes (10 + species adjustment, +5 points, max 13 + species bonus),
  one Specialty (+3) and nine Trained (+1) skills with Untrained at −4, advantage, complication,
  equipment and crew connection. A readiness checklist flags anything that breaks the creation rules.
- **Species advantages**: each species offers two or three advantages (a narrow +2 or a GM-limited ability), each paired with a companion complication. A species advantage replaces the regular advantage; the regular complication still applies. Custom pairs are supported.
- **Duty station**: final skill targets with 3d6 odds, Dodge, injury track, Duty points, and a roller that
  applies circumstance modifiers, assistance, advantage, injury and stun penalties, natural 3–4 / 17–18,
  margins, and Duty point rerolls.
- Officers save in the browser and can be shared as JSON.

### Saving a sheet as PDF

Open `uss-pelion/index.html` directly in a browser (not the hosted artifact, which blocks printing),
build or load your officer, then press **Save as PDF** in the header (or Ctrl/Cmd+P) and choose
"Save as PDF" as the destination. The printout is a light, ink-friendly version of the character sheet
with blank injury and Duty point tracks and the quick reference.

## Players' Guide

`uss-pelion/players-guide.md` is the revised Players' Guide: the original rules plus General Services,
species attribute adjustments, and species advantages with companion complications. It appears in the
creator's **Players' Guide** tab and as `uss-pelion/USS_Pelion_Players_Guide.docx`.

After editing the Markdown, rebuild both with `python3 tools/build-guide.py --docx`
(needs pandoc; python-docx adds table borders to the Word file).
