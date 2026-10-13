# Design rules

What this panel is allowed to look like, and why. Written after four passes and some reading. The short version: the AI look is not a palette, it is the absence of a decision. Every rule below is a decision.

## The tells (what gives a design away)

Collected from critiques of AI-generated and template UI. If any of these show up in a screenshot, that is the thing to cut.

- Blue-to-purple gradient anywhere. Traced to Tailwind's `indigo-500` default being copied into training data for years.
- Glass cards floating on a gradient. Frosted panels, glow, blurred blobs.
- Grid or dot-pattern backgrounds behind a hero.
- Three evenly spaced feature cards. A centered hero with one button.
- Gradient text on a headline. Oversized display type for a tool that will be used at 13px.
- The "editorial" costume: cream background, a serif display face, one red accent, a rubber stamp. This became its own template in 2025.
- Default component libraries left at default: shadcn radii, shadows, spacing. shadcn's own changelog admits "all apps started looking the same".
- Fade-up-on-scroll animation on everything.
- Placeholder names in the demo data: Acme, Globex, John Doe, Lorem.
- Copy with no person behind it: "seamlessly", "supercharge", "effortless", "unlock".
- Fake window chrome drawn in HTML and screenshotted on a gradient desktop.

## What the good ones do

Linear, Raycast, Things, iA Writer, and the best native Mac apps share a few habits. None of them is a color.

1. **The product is the hero.** Their marketing shows the real interface with real data. No illustration stands in for the thing.
2. **Near-monochrome, one accent, used functionally.** The accent marks the selected item, the focus ring, and the primary button. Never decoration.
3. **Type and spacing carry the look.** A real scale, small sizes, tabular numerals where numbers align. The font is boring on purpose.
4. **Density is information, not clutter.** Tufte's data-ink idea applied to pixels: every element should be data the user needs. Paths, counts, timestamps, model names. Remove what is not.
5. **Platform conventions.** On a Mac: sidebar, toolbar, inspector, status bar, keyboard shortcuts with the right glyphs, menu-style section headers. A "Mac-assed Mac app" is judged by conventions, not toolkit.
6. **Restraint reads as confidence.** Motion only to guide attention. Honest microcopy. Considered empty states.
7. **Details nobody notices until they are missing.** Hover states, disabled states, the 50ms delay that prevents a flash, correct focus order.

## Rules for deskhand

- **Window, not page.** Titlebar, sidebar, inspector, status bar. The panel behaves like a document window.
- **System font, 13px body, 11px status.** `-apple-system` first. Inter only as the fallback on non-Mac machines.
- **One accent.** System blue, used for the selected runbook, the focus ring, and Approve. Nothing else is blue.
- **Diff semantics are borrowed, not invented.** Red and green line backgrounds, line numbers, plus and minus signs, the same way Xcode and GitHub do it.
- **Every string in the status bar is real.** Profile path, model id, call count, log file, elapsed time come from the running process. If a value is unavailable, show nothing, not a placeholder.
- **No decoration budget.** No gradients, shadows beyond a 1px hairline, glows, patterns, or illustrations.
- **Keyboard first.** ⌘↩ approves, esc declines, and the buttons say so with the real glyphs.
- **Copy sounds like a note to a colleague.** "Nothing is written until you approve." Not "Review changes with confidence."
- **Demo data must survive a second look.** Company names, emails, and amounts should look like a real CRM, not a tutorial.

## Taking screenshots

The screenshots in this folder are rendered on Linux, so they fall back to Inter and a hand-drawn titlebar. On a Mac, do this instead and replace them:

```sh
npx deskhand demo lead-to-crm --ui        # opens the panel in Chrome
```

Open the panel URL in Chrome's app mode so there is no browser chrome (`open -na "Google Chrome" --args --app=http://localhost:4747`), then ⌘⇧4, space, click the window. That gives a real titlebar, real SF Pro, and the real window shadow. `docs/shoot.js` still works for the fixture apps and the cover.

## Sources

- [The Purple Gradient Problem](https://dev.to/james_anderson_h/the-purple-gradient-problem-why-ai-ui-all-looks-alike-and-how-to-fix-it-3j65) and [Blame Tailwind's Indigo-500](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)
- [AI Slop Fonts and Gradients: The Tells](https://www.925studios.co/blog/ai-slop-design-tells)
- [How to fix the AI-generated look in your frontend](https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh)
- [The Linear, Vercel, and Raycast Aesthetic: What It Actually Is](https://studiomaydit.com/blog/linear-vercel-raycast-aesthetic)
- [Linear design: boring and bettering UI](https://blog.logrocket.com/ux-design/linear-design/)
- [Is anyone else tired of every Tailwind/shadcn app looking the same?](https://www.designsystemscollective.com/is-anyone-else-tired-of-every-tailwind-shadcn-app-looking-the-same-69c545e73114) and the [shadcn create changelog](https://ui.shadcn.com/docs/changelog/2025-12-shadcn-create)
- [UI Density, Matthew Ström](https://matthewstrom.com/writing/ui-density)
- [Mac-assed Mac apps, Daring Fireball](https://daringfireball.net/linked/2020/03/20/mac-assed-mac-apps) and [What Makes an App Feel Right on the Mac](https://coyotetracks.org/blog/app-feel-on-mac/)
- [A Technical Deep Dive Into the New Raycast](https://www.raycast.com/blog/a-technical-deep-dive-into-the-new-raycast)
- [Rauno Freiberg, Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design) (summaries only; the essay itself was not reachable from here)
