# @umoja/ui

Typed, semantic Umoja interface primitives. Import `@umoja/ui/styles.css` once in the application
root, then import components from `@umoja/ui`. Raw design tokens are also available through
`@umoja/ui/tokens.css`.

## Variants

| Primitive              | Variants                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `Button`, `LinkButton` | `primary`, `secondary`, `highlight`, `ghost`, `inverse`, `danger`; sizes `small`, `medium`, `large` |
| `Container`            | `narrow`, `default`                                                                                 |
| `Section`              | tones `canvas`, `sand`, `canopy`, `ink`; spacing `compact`, `default`, `spacious`                   |
| `Card`                 | tones `white`, `sand`, `canvas`, `dark`; padding `compact`, `default`, `spacious`                   |
| `Badge`                | `neutral`, `success`, `warning`, `danger`, `info`, `accent`, `inverse`                              |
| `Logo`                 | `full`, `mark`, `mono`; sizes `small`, `medium`, `large`                                            |

Use `inverse` controls only on Ink or Canopy surfaces. Semantic badges must include status text;
colour is never the only cue. All button and link-button sizes preserve a 44×44 CSS-pixel minimum
target. `Logo` exposes an accessible name by default; set `decorative` only when adjacent content
already identifies Umoja.

The development-only `/design-system` route is the visual reference for tokens, variants, dark
surfaces, bilingual content, and state stress fixtures.
