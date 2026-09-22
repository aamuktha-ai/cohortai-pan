# Where to Start in This Project

This is the quick map I use when I come back to the project.

## If you want to understand the tool first

Start with index.html and src/app.js. That is the user-facing part of the project. It handles the form, dictionary uploads, the Generate button, and the report people see at the end.

## If you want to understand how matching works

Look at src/analysisEngine.js and src/panHarmonizationProfile.js.

- analysisEngine.js reads different dictionary formats and looks for the best field descriptions to compare.
- panHarmonizationProfile.js is where the PAN-specific rules live. This is the file to look at when checking why the tool called something Direct, Analogous, Partial, Supplemental, No match, or Needs review.

I would change the profile before changing the matching engine if the rule itself changes. I would only change the matching engine if the tool is reading a dictionary format incorrectly or missing a type of variable.

## If you want to run it on your computer

Run:

~~~bash
npm run dev
~~~

The local server is in server.js. It provides the local API and loads a PAN reference through src/panReference.js when a secure server setup is being used.

## If you want to check that changes did not break things

Run:

~~~bash
npm test
~~~

The tests are in the test folder. They cover the PAN reference loader, CSV and PDF-style dictionary parsing, core matching rules, and the validation calculations.

## If you want to update the public PAN snapshot later

The current GitHub Pages version uses the public file in reference-data/PAN_Data_Dictionary.csv. The release details shown in the report are in reference-data/pan-release.json.

The optional update script is scripts/update-pan-reference.js. It is there for later, when there is an approved PAN release process. It is not connected to an outside PAN source right now.

## Files I would be careful changing

- reference-data/PAN_Data_Dictionary.csv: this is the dictionary used by the public demo.
- src/panHarmonizationProfile.js: changing a rule changes how the tool labels a comparison.
- server.js and src/panReference.js: these matter for a future secure deployment.

For a normal interface or wording change, start with index.html, src/app.js, and src/styles.css.
