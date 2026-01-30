# Aimfox Insomnia export (how to store/use)

Yes — what you pasted is an **Insomnia export JSON** (it includes `"_type": "export"` and `__export_format`).

## Recommended repo location

Save the full JSON file as:

- `docs/vendor/aimfox/raw/aimfox.insomnia.json`

Then you can reference it in Cursor when needed:

- `@docs/vendor/aimfox/raw/aimfox.insomnia.json`

## Why keep it

- It’s a structured list of endpoints, example bodies, and response snippets.
- It’s often more useful than HTML scraping for building integrations.

## Security note

Keep tokens as placeholders (like `YOUR_API_KEY`). Don’t commit real keys.

